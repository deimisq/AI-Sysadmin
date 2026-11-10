using AiSysadminDesktop;
using Xunit;

public sealed class ChatResponseTests
{
    [Fact]
    public void RecognizesTheMarkdownResponseShownInTheScreenshot()
    {
        var response = ChatResponse.Parse("Para revisar el estado general del sistema, te propongo ejecutar:\n\n```bash\nuptime && free -h && df -h\n```\n\n### Propósito y efecto\nMuestra carga, memoria y discos.");
        Assert.Equal("uptime && free -h && df -h", response.Command);
        Assert.Contains("Propósito", response.Analysis);
    }
    [Theory]
    [InlineData("```sh\nid\n```\n```bash\ndf -h\n```")]
    [InlineData("```bash\nid")]
    [InlineData("```python\nprint('example')\n```")]
    [InlineData("Ejecutá `id` cuando quieras.")]
    [InlineData("Sin comandos necesarios.")]
    public void AmbiguousIncompleteOrInlineExamplesDoNotBecomeCommands(string content)
    {
        Assert.Null(ChatResponse.Parse(content).Command);
    }
    [Fact]
    public void ExplicitNullDoesNotTurnAnInformationalExampleIntoAnAction()
    {
        var result = ChatResponse.Parse("{\"analysis\":\"Ejemplo: \\n```bash\\nid\\n```\",\"proposed_command\":null}");
        Assert.Null(result.Command);
    }

    [Fact]
    public void StructuredCommandTakesPrecedenceOverMarkdownExamples()
    {
        var result = ChatResponse.Parse("{\"analysis\":\"Ejemplo: ```bash\\nid\\n```\",\"proposed_command\":\"df -h\"}");
        Assert.Equal("df -h", result.Command);
    }
}
