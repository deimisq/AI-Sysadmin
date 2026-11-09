using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

public sealed class LocalInventoryBackupTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(),"AiBackupTests",Guid.NewGuid().ToString("N"));
    private LocalConnectionStore Store(string name) => new(Path.Combine(_directory,name+".dat"));
    private const string Password = "synthetic backup password";
    private static JsonElement Body(object value) => JsonSerializer.SerializeToElement(value);
    private LocalConnectionStore Setup(string name)
    {
        var store = Store(name);
        store.Handle("POST","/servers/",Body(new { hostname="Lab",ip_address="192.0.2.1",ssh_password="synthetic-server-secret",ssh_key_path="C:/keys/example.pem" }));
        store.Handle("PUT","/workspace/folders",Body(new { revision=0,layout=new { folders=new[] { new { id="client",name="Client",parentId=(string?)null },new { id="infra",name="Infrastructure",parentId=(string?)"client" } },assignments=new Dictionary<string,string> { ["1"]="infra" } } }));
        return store;
    }
    [Fact] public void PortableCopyRestoresCredentialsAndFolderTreeWithoutReplacingExistingConnections()
    {
        var source=Setup("source"); var target=Setup("target");
        var encoded=source.ExportBackup(Password);
        Assert.DoesNotContain("synthetic-server-secret",Encoding.UTF8.GetString(Convert.FromBase64String(encoded)));
        var preview=target.PreviewBackup(encoded,Password);
        Assert.Equal(1,preview.GetProperty("connections").GetInt32()); Assert.Equal(2,preview.GetProperty("folders").GetInt32()); Assert.Equal(1,preview.GetProperty("external_key_files").GetInt32());
        Assert.DoesNotContain("synthetic-server-secret",preview.GetRawText());
        var result=target.ImportBackup(encoded,Password,preview.GetProperty("hash").GetString()!,true,Guid.NewGuid().ToString());
        Assert.Equal(1,result.GetProperty("imported").GetInt32());
        Assert.Equal(2,target.Handle("GET","/servers/",default).GetArrayLength());
        Assert.Equal("synthetic-server-secret",target.Handle("GET","/servers/2/credentials",default).GetProperty("ssh_password").GetString());
        var layout=target.Handle("GET","/workspace/folders",default).GetProperty("layout");
        Assert.Equal(4,layout.GetProperty("folders").GetArrayLength());
        var mapped=layout.GetProperty("assignments").GetProperty("2").GetString(); Assert.NotEqual("infra",mapped);
        Assert.Contains(layout.GetProperty("folders").EnumerateArray(),folder=>folder.GetProperty("id").GetString()==mapped);
    }
    [Fact] public void WrongPasswordAndTamperingNeverChangeTheTarget()
    {
        var source=Setup("source"); var target=Setup("target"); var encoded=source.ExportBackup(Password);
        var before=File.ReadAllBytes(Path.Combine(_directory,"target.dat"));
        Assert.Throws<ArgumentException>(()=>target.PreviewBackup(encoded,"another wrong password"));
        var bytes=Convert.FromBase64String(encoded); bytes[^1]^=1;
        Assert.Throws<ArgumentException>(()=>target.ImportBackup(Convert.ToBase64String(bytes),Password,"hash",true,Guid.NewGuid().ToString()));
        Assert.Equal(before,File.ReadAllBytes(Path.Combine(_directory,"target.dat")));
    }
    [Fact] public void RequiresConfirmationAndExactPreviewHashAndDoesNotRepeatTheSameOperation()
    {
        var source=Setup("source"); var target=Setup("target"); var encoded=source.ExportBackup(Password); var preview=target.PreviewBackup(encoded,Password); var hash=preview.GetProperty("hash").GetString()!; var operation=Guid.NewGuid().ToString();
        Assert.Throws<InvalidOperationException>(()=>target.ImportBackup(encoded,Password,hash,false,operation));
        Assert.Throws<InvalidOperationException>(()=>target.ImportBackup(encoded,Password,"wrong",true,operation));
        target.ImportBackup(encoded,Password,hash,true,operation);
        Assert.True(target.ImportBackup(encoded,Password,hash,true,operation).GetProperty("already_applied").GetBoolean());
        Assert.Equal(2,target.Handle("GET","/servers/",default).GetArrayLength());
    }
    [Fact] public void DoesNotExportAiKeyOrChatHistoryAndPreservesTargetAiSettings()
    {
        var source=Setup("source"); var target=Setup("target");
        source.Handle("PUT","/ai/settings",Body(new { base_url="https://source.example/v1",model="source-model",api_key="source-ai-secret",consent_accepted=true }));
        source.SaveAiTurn(source.PrepareAiInvocation(1,"private chat question"),"private chat answer",null);
        target.Handle("PUT","/ai/settings",Body(new { base_url="https://target.example/v1",model="target-model",api_key="target-ai-secret",consent_accepted=true }));
        var encoded=source.ExportBackup(Password); var preview=target.PreviewBackup(encoded,Password);
        target.ImportBackup(encoded,Password,preview.GetProperty("hash").GetString()!,true,Guid.NewGuid().ToString());
        Assert.Equal("target-model",target.Handle("GET","/ai/settings",default).GetProperty("model").GetString());
        Assert.Empty(target.Handle("GET","/servers/2/history",default).EnumerateArray());
        // Decrypt the portable format independently to assert exclusions, rather than trusting import behavior.
        var bytes=Convert.FromBase64String(encoded); var key=Rfc2898DeriveBytes.Pbkdf2(Password,bytes.AsSpan(8,16),600000,HashAlgorithmName.SHA256,32); var plain=new byte[bytes.Length-52];
        using var aes=new AesGcm(key,16); aes.Decrypt(bytes.AsSpan(24,12),bytes.AsSpan(52),bytes.AsSpan(36,16),plain,bytes.AsSpan(0,36));
        var json=Encoding.UTF8.GetString(plain); Assert.DoesNotContain("source-ai-secret",json); Assert.DoesNotContain("private chat",json); CryptographicOperations.ZeroMemory(key); CryptographicOperations.ZeroMemory(plain);
    }
    [Fact] public void FolderUpdatesRejectCyclesStaleRevisionsAndForeignAssignments()
    {
        var store=Setup("source");
        Assert.Throws<InvalidOperationException>(()=>store.Handle("PUT","/workspace/folders",Body(new { revision=0,layout=new { folders=Array.Empty<object>(),assignments=new{} } })));
        Assert.Throws<ArgumentException>(()=>store.Handle("PUT","/workspace/folders",Body(new { revision=1,layout=new { folders=new[] {new {id="cycle",name="Cycle",parentId="cycle"}},assignments=new{} } })));
        Assert.Throws<ArgumentException>(()=>store.Handle("PUT","/workspace/folders",Body(new { revision=1,layout=new { folders=new[] {new {id="ok",name="OK",parentId=(string?)null}},assignments=new Dictionary<string,string>{["999"]="ok"} } })));
        Assert.Equal(2,store.Handle("GET","/workspace/folders",default).GetProperty("layout").GetProperty("folders").GetArrayLength());
    }
    [Fact] public void ExportRequiresFolderMigrationAndStrongEnoughPassphrase()
    {
        var store=Store("unmigrated");
        Assert.Throws<InvalidOperationException>(()=>store.ExportBackup(Password));
        Assert.Throws<ArgumentException>(()=>store.ExportBackup("short"));
    }
    [Fact] public void VersionTwoInventoryMigratesWithoutLosingCredentialsAndWritesVersionThree()
    {
        var store=Setup("source"); var path=Path.Combine(_directory,"source.dat"); var entropy=Encoding.UTF8.GetBytes("AiSysadmin.LocalConnections.v1");
        var node=System.Text.Json.Nodes.JsonNode.Parse(ProtectedData.Unprotect(File.ReadAllBytes(path),entropy,DataProtectionScope.CurrentUser))!;
        node["version"]=2; node.AsObject().Remove("folders"); node.AsObject().Remove("folder_revision"); node.AsObject().Remove("restores");
        File.WriteAllBytes(path,ProtectedData.Protect(Encoding.UTF8.GetBytes(node.ToJsonString()),entropy,DataProtectionScope.CurrentUser));
        Assert.False(store.Handle("GET","/workspace/folders",default).GetProperty("migrated").GetBoolean());
        store.Handle("PUT","/workspace/folders",Body(new { revision=0,layout=new { folders=Array.Empty<object>(),assignments=new{} } }));
        Assert.Equal("synthetic-server-secret",store.Handle("GET","/servers/1/credentials",default).GetProperty("ssh_password").GetString());
        using var saved=JsonDocument.Parse(ProtectedData.Unprotect(File.ReadAllBytes(path),entropy,DataProtectionScope.CurrentUser));
        Assert.Equal(3,saved.RootElement.GetProperty("version").GetInt32());
    }
    [Fact] public void CopiesUseFreshSaltAndNonceAndDeletionRemovesFolderAssignment()
    {
        var store=Setup("source"); Assert.NotEqual(store.ExportBackup(Password),store.ExportBackup(Password));
        store.Handle("DELETE","/servers/1",default);
        Assert.Empty(store.Handle("GET","/workspace/folders",default).GetProperty("layout").GetProperty("assignments").EnumerateObject());
        Assert.Equal(0,store.PreviewBackup(store.ExportBackup(Password),Password).GetProperty("connections").GetInt32());
    }
    public void Dispose() { if(Directory.Exists(_directory)) Directory.Delete(_directory,true); }
}
