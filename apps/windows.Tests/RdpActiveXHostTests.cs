using System.ComponentModel;
using AiSysadminDesktop;
using Xunit;

namespace AiSysadmin.Tests;

public class RdpActiveXHostTests
{
    [Fact]
    public void TwoControlsKeepIndependentSettingsWhenOneIsClosed()
    {
        Exception? failure = null;
        var thread = new Thread(() => {
            try {
                using var first = new RdpActiveXHost();
                using var second = new RdpActiveXHost();
                first.CreateControl(); second.CreateControl();
                dynamic firstClient = first.Client;
                dynamic secondClient = second.Client;
                firstClient.AdvancedSettings9.RDPPort = 3391;
                secondClient.AdvancedSettings9.RDPPort = 3392;
                first.Visible = false;
                Assert.Equal(3392, (int)secondClient.AdvancedSettings9.RDPPort);
                first.Dispose();
                Assert.Equal(3392, (int)secondClient.AdvancedSettings9.RDPPort);
                Assert.Equal(0, (int)secondClient.Connected);
            }
            catch (Exception error) { failure = error; }
        });
        thread.IsBackground = true;
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        Assert.True(thread.Join(TimeSpan.FromSeconds(20)), "RDP initialization timed out.");
        Assert.Null(failure);
    }

    [Fact]
    public void InstalledRdpControlInitializesWithoutProgIdOrNetworkConnection()
    {
        Exception? failure = null;
        var thread = new Thread(() => {
            try {
                using var host = new RdpActiveXHost();
                using var surface = new System.Windows.Forms.Panel { Size = new System.Drawing.Size(960, 540) };
                ((ISupportInitialize)host).BeginInit();
                host.Dock = System.Windows.Forms.DockStyle.Fill;
                surface.Controls.Add(host);
                ((ISupportInitialize)host).EndInit();
                host.Visible = true;
                surface.CreateControl();
                host.CreateControl();
                surface.PerformLayout();
                Assert.True(host.Visible);
                Assert.Equal(surface.ClientSize, host.Size);
                dynamic client = host.Client;
                client.AdvancedSettings9.RDPPort = 3390;
                Assert.Equal(3390, (int)client.AdvancedSettings9.RDPPort);
                Assert.Equal(0, (int)client.Connected);
            }
            catch (Exception error) { failure = error; }
        });
        thread.IsBackground = true;
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        Assert.True(thread.Join(TimeSpan.FromSeconds(20)), "RDP initialization timed out.");
        Assert.Null(failure);
    }
}
