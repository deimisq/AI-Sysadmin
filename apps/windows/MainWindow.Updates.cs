using System.Text.Json;
using System.Windows;
using MessageBox = System.Windows.MessageBox;

namespace AiSysadminDesktop;

public partial class MainWindow
{
    private readonly AppUpdates _updates = new();
    protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
    {
        if(_updates.IsInstalling) {
            e.Cancel=true;
            MessageBox.Show(this,UserLanguage.Text("La actualización se está instalando. Esperá a que termine antes de cerrar la aplicación."),UserLanguage.Text("Actualización en curso"),MessageBoxButton.OK,MessageBoxImage.Information);
        }
        base.OnClosing(e);
    }
    private async Task<object> HandleUpdateAsync(string type,JsonElement payload)
    {
        if(type=="OPEN_SENTRAIT") {
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(DesktopShellPolicy.OfficialWebsite) { UseShellExecute=true });
            return true;
        }
        if(type=="APP_INFO") return new {
            version=AppUpdates.CurrentVersion, product="AI Sysadmin Agent", repository=AppUpdates.Repository,
            runtime=System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
            architecture=System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture.ToString(),
            os=System.Runtime.InteropServices.RuntimeInformation.OSDescription,
            commit=typeof(AppUpdates).Assembly.GetCustomAttributes(typeof(System.Reflection.AssemblyInformationalVersionAttribute),false)
                .Cast<System.Reflection.AssemblyInformationalVersionAttribute>().First().InformationalVersion.Split('+').ElementAtOrDefault(1) ?? "",
            data_directory=System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"AiSysadmin"),
            installed=AppUpdates.InstallRoot()!=null
        };
        if(type=="UPDATE_TOKEN") { _updates.SaveToken(payload.GetProperty("token").GetString() ?? ""); return _updates.Status(); }
        if(type=="UPDATE_CHECK") await _updates.CheckAsync();
        if(type=="UPDATE_DOWNLOAD") {
            if(MessageBox.Show(this,UserLanguage.Text("¿Descargar la actualización desde los releases de deimisq/AI-Sysadmin? No se instalará hasta que lo apruebes."),UserLanguage.Text("Descargar actualización"),MessageBoxButton.YesNo,MessageBoxImage.Question)!=MessageBoxResult.Yes) return _updates.Status();
            await _updates.DownloadAsync();
        }
        if(type=="UPDATE_INSTALL") {
            if(MessageBox.Show(this,UserLanguage.Text("¿Instalar la actualización descargada y verificada? La app seguirá abierta y te avisará cuando esté lista para reiniciar. Se conservarán tus datos y conexiones."),UserLanguage.Text("Instalar actualización"),MessageBoxButton.YesNo,MessageBoxImage.Question)!=MessageBoxResult.Yes) return _updates.Status();
            await _updates.InstallAsync();
        }
        if(type=="UPDATE_RESTART") {
            if(MessageBox.Show(this,UserLanguage.Text("¿Reiniciar AI Sysadmin para aplicar la actualización? Se cerrarán las sesiones SSH y RDP abiertas. Guardá tu trabajo antes de continuar."),UserLanguage.Text("Reiniciar aplicación"),MessageBoxButton.YesNo,MessageBoxImage.Warning)!=MessageBoxResult.Yes) return _updates.Status();
            _updates.Restart(); Close();
        }
        return _updates.Status();
    }
}
