using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

public class PreferencesPolicyTests
{
    [Theory]
    [InlineData("GET", "/ai/settings", true)]
    [InlineData("PUT", "/ai/settings", true)]
    [InlineData("DELETE", "/ai/settings", true)]
    [InlineData("POST", "/ai/settings", false)]
    [InlineData("PUT", "/workspace/context-policy", true)]
    [InlineData("GET", "/servers/1/credentials", false)]
    [InlineData("DELETE", "/servers/1", false)]
    [InlineData("POST", "/agent/diagnose", false)]
    public void OnlyAllowsPreferencesEndpoints(string method, string endpoint, bool expected) =>
        Assert.Equal(expected, PreferencesPolicy.Allows("LOCAL_REQUEST", JsonSerializer.SerializeToElement(new { method, endpoint })));

    [Theory]
    [InlineData("SSH_CONNECT")]
    [InlineData("PTY_WRITE")]
    [InlineData("LOCAL_AI_DIAGNOSE")]
    [InlineData("LOCAL_TASK_START")]
    [InlineData("SFTP_TRANSFER_START")]
    public void DoesNotGrantSessionOrAgentTools(string type) => Assert.False(PreferencesPolicy.Allows(type, JsonSerializer.SerializeToElement(new { })));
}
