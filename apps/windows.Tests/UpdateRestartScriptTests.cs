using System.Diagnostics;
using System.Text;
using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

public sealed class UpdateRestartScriptTests
{
    [Fact] public async Task PathsAreDataAndGeneratedPowerShellParsesWithoutExecutingIt()
    {
        var root=@"C:\synthetic folder\O'Brien & data";
        var script=UpdateRestartScript.Create(123,root+@"\setup.exe",root,new string('a',64),7,root+@"\install.log","Error sintético");
        var start=script.IndexOf("FromBase64String('",StringComparison.Ordinal)+"FromBase64String('".Length;
        var end=script.IndexOf("')",start,StringComparison.Ordinal);
        using var plan=JsonDocument.Parse(Convert.FromBase64String(script[start..end]));
        Assert.Equal(root,plan.RootElement.GetProperty("root").GetString());
        Assert.DoesNotContain(root,script);
        var encoded=Convert.ToBase64String(Encoding.UTF8.GetBytes(script));
        var parser=$"$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseInput([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{encoded}')),[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count){{exit 1}}";
        var info=new ProcessStartInfo("powershell.exe"){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden};
        foreach(var argument in new[]{"-NoProfile","-NonInteractive","-EncodedCommand",Convert.ToBase64String(Encoding.Unicode.GetBytes(parser))})info.ArgumentList.Add(argument);
        using var process=Process.Start(info)!;
        await process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(20));
        Assert.Equal(0,process.ExitCode);
    }
}
