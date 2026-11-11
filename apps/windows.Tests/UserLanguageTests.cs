using AiSysadminDesktop;
using Xunit;

public sealed class UserLanguageTests
{
    [Theory]
    [InlineData("Configuración", "Settings")]
    [InlineData("Guardar copia cifrada", "Save encrypted backup")]
    [InlineData("Instalar actualización", "Install update")]
    [InlineData("Revocar permiso automático", "Revoke automatic permission")]
    public void SpanishAndEnglishUseTheEmbeddedCatalogWithoutChangingTheUserProfile(string spanish, string english)
    {
        Assert.Equal(spanish, UserLanguage.Translate(spanish, "es"));
        Assert.Equal(english, UserLanguage.Translate(spanish, "en"));
        Assert.Equal(spanish, UserLanguage.Translate(spanish, "invalid"));
    }

    [Fact]
    public void UnrecognizedUserOrTerminalDataIsPreserved()
    {
        const string data = "equipo-del-cliente: printf 'Conexiones'\nresultado sintético";
        Assert.Equal(data, UserLanguage.Translate(data, "en"));
    }
}
