using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Reflection;

namespace RdpHost
{
    // Custom wrapper to avoid external DLL dependencies (Zero-Dependency AxHost)
    public class NativeRdpClient : AxHost
    {
        // CLSID for MsRdpClient9NotSafeForScripting
        public NativeRdpClient() : base("54d38bf7-b1ef-4479-9674-1bd6ea465258") 
        {
        }

        // Fix for "ActiveX control cannot be instantiated"
        protected override void AttachInterfaces()
        {
            base.AttachInterfaces();
        }
    }

    public class RdpForm : Form
    {
        private NativeRdpClient rdpClient;
        
        // P/Invoke for embedding
        [DllImport("user32.dll")]
        static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);
        
        [DllImport("user32.dll")]
        static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

        [DllImport("user32.dll")]
        static extern int GetWindowLong(IntPtr hWnd, int nIndex);
        
        const int GWL_STYLE = -16;
        const int WS_CHILD = 0x40000000;
        const int WS_POPUP = unchecked((int)0x80000000);

        public RdpForm(string[] args)
        {
            try
            {
                // Parse arguments
                string host = "", user = "", pass = "";
                int width = 800, height = 600;
                IntPtr parentHwnd = IntPtr.Zero;

                for (int i = 0; i < args.Length; i++)
                {
                    if (args[i].StartsWith("/parent:")) parentHwnd = new IntPtr(long.Parse(args[i].Substring(8)));
                    if (args[i].StartsWith("/v:")) host = args[i].Substring(3);
                    if (args[i].StartsWith("/u:")) user = args[i].Substring(3);
                    if (args[i].StartsWith("/p:")) pass = args[i].Substring(3);
                    if (args[i].StartsWith("/w:")) width = int.Parse(args[i].Substring(3));
                    if (args[i].StartsWith("/h:")) height = int.Parse(args[i].Substring(3));
                }

                // Window Setup
                this.FormBorderStyle = FormBorderStyle.None;
                this.Width = width;
                this.Height = height;
                this.BackColor = Color.Black;
                this.ShowInTaskbar = false;

                // Initialize RDP Control dynamically
                rdpClient = new NativeRdpClient();
                this.Controls.Add(rdpClient);
                rdpClient.Dock = DockStyle.Fill;
                
                // We need to wait for Handle creation to use OCX methods
                rdpClient.CreateControl();
                
                // Use dynamic to access properties without typed DLLs
                dynamic ocx = rdpClient.GetOcx();

                ocx.Server = host;
                ocx.UserName = user;
                
                // AdvancedSettings7 property
                var advanced = ocx.AdvancedSettings7;
                advanced.ClearTextPassword = pass;
                advanced.EnableCredSspSupport = true;
                advanced.PublicMode = false;
                advanced.SmartSizing = true;
                
                // Connect
                ocx.Connect();
                
                // Embed if parent provided
                if (parentHwnd != IntPtr.Zero)
                {
                    this.Load += (s, e) => {
                        // Change style to Child
                        int style = GetWindowLong(this.Handle, GWL_STYLE);
                        SetWindowLong(this.Handle, GWL_STYLE, (style & ~WS_POPUP) | WS_CHILD);
                        SetParent(this.Handle, parentHwnd);
                    };
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error: " + ex.Message + "\n" + ex.StackTrace);
                Application.Exit();
            }
        }
    }

    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new RdpForm(args));
        }
    }
}
