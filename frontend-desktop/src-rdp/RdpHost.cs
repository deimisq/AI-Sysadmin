using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using MSTSCLib; // We will generate this Interop

namespace RdpHost
{
    public class RdpForm : Form
    {
        private AxMSTSCLib.AxMsRdpClient9NotSafeForScripting rdpClient;
        
        // P/Invoke for SetParent
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

            // Initialize RDP Control
            try 
            {
                rdpClient = new AxMSTSCLib.AxMsRdpClient9NotSafeForScripting();
                ((System.ComponentModel.ISupportInitialize)(rdpClient)).BeginInit();
                this.Controls.Add(rdpClient);
                rdpClient.Dock = DockStyle.Fill;
                
                // Configure RDP
                rdpClient.Server = host;
                rdpClient.UserName = user;
                rdpClient.AdvancedSettings7.ClearTextPassword = pass;
                rdpClient.AdvancedSettings7.EnableCredSspSupport = true;
                rdpClient.AdvancedSettings7.PublicMode = false;
                rdpClient.AdvancedSettings7.SmartSizing = true;
                
                // Events
                rdpClient.OnDisconnected += (s, e) => Application.Exit();

                ((System.ComponentModel.ISupportInitialize)(rdpClient)).EndInit();
                
                // Connect
                rdpClient.Connect();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error initializing RDP: " + ex.Message);
                Application.Exit();
            }

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
