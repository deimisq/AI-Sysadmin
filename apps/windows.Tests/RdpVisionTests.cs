using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

public sealed class RdpVisionTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(),"AiRdpVision",Guid.NewGuid().ToString("N"));
    private static JsonElement Body(object value) => JsonSerializer.SerializeToElement(value);
    private static string Image() {
        using var bitmap = new System.Drawing.Bitmap(2,2);
        using var output = new MemoryStream(); bitmap.Save(output,System.Drawing.Imaging.ImageFormat.Png);
        return "data:image/png;base64," + Convert.ToBase64String(output.ToArray());
    }
    private sealed class Handler(Func<HttpRequestMessage,Task<HttpResponseMessage>> callback) : HttpMessageHandler {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken token) => callback(request);
    }
    [Theory]
    [InlineData("gemini")]
    [InlineData("openai")]
    [InlineData("claude")]
    [InlineData("ollama")]
    public async Task ReviewedImageUsesMultimodalPayloadAndIsNeverReplayedFromHistory(string provider)
    {
        var store = new LocalConnectionStore(Path.Combine(_directory,"inventory.dat"));
        store.Handle("POST","/servers/",Body(new { hostname="Test",ip_address="192.0.2.1",connection_protocol="rdp" }));
        store.Handle("PUT","/ai/settings",Body(new { provider,base_url="http://localhost:11434",model="vision-test",api_key=provider == "ollama" ? "" : "synthetic",consent_accepted=true }));
        var image = Image(); var calls = 0;
        using var service = new LocalAiService(store,new Handler(async request => {
            using var document = JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
            var messages = document.RootElement.GetProperty("messages").EnumerateArray().ToArray();
            var content = messages[^1].GetProperty("content");
            if (calls++ == 0) {
                Assert.Equal(JsonValueKind.Array,content.ValueKind);
                if (provider == "claude") {
                    Assert.Equal("image",content[0].GetProperty("type").GetString());
                    Assert.Equal(image[22..],content[0].GetProperty("source").GetProperty("data").GetString());
                } else Assert.Equal(image,content[1].GetProperty("image_url").GetProperty("url").GetString());
            } else { Assert.Equal(JsonValueKind.String,content.ValueKind); Assert.DoesNotContain(image,document.RootElement.GetRawText()); }
            var answer = "{\"analysis\":\"Ventana de prueba visible\",\"proposed_command\":null}";
            var response = provider == "claude" ? JsonSerializer.Serialize(new { content=new[] { new {type="text",text=answer} } }) : JsonSerializer.Serialize(new { choices=new[] { new {message=new {content=answer}} } });
            return new HttpResponseMessage(HttpStatusCode.OK) { Content=new StringContent(response) };
        }));
        await Assert.ThrowsAsync<ArgumentException>(() => service.DiagnoseAsync(Body(new { server_id=1,problem_description="What is visible?",rdp_image=image,image_reviewed=false })));
        Assert.Equal(0,calls);
        await service.DiagnoseAsync(Body(new { server_id=1,problem_description="What is visible?",rdp_image=image,image_reviewed=true }));
        Assert.DoesNotContain(image,store.Handle("GET","/servers/1/history",default).GetRawText());
        await service.DiagnoseAsync(Body(new { server_id=1,problem_description="Explain that observation" }));
        Assert.Equal(2,calls);
    }
    [Theory]
    [InlineData("https://example.com/image.png")]
    [InlineData("data:image/png;base64,bm90IGEgcG5n")]
    [InlineData("data:image/jpeg;base64,AAAA")]
    public void RejectsRemoteUrlsAndInvalidImages(string image) => Assert.Throws<ArgumentException>(() => RdpImage.Validate(image,true));
    public void Dispose() { if (Directory.Exists(_directory)) Directory.Delete(_directory,true); }
}
