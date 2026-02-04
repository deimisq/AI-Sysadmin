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
        // CLSID for MsRdpClient9NotSafeForScripting or generic MsRdpClient
        // Using generic MsRdpClient7 CLSID: 9059f30f-4eb1-4bd2-9fdc-36f43a218f4a
        // Or if that fails, try the newer one: 54d38bf7-b1ef-4479-9674-1bd6ea465258
        public NativeRdpClient() : base("9059f30f-4eb1-4bd2-9fdc-36f43a218f4a") 
        {
        }

        protected override void AttachInterfaces()
        {
            base.AttachInterfaces();
        }
    }

    public class RdpForm : Form
    {
        private NativeRdpClient rdpClient;
        
        // P/Invoke - Using EntryPoint alias to handle 32/64 bit differences if needed
        [DllImport("user32.dll", SetLastError = true)]
        static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);
        
        // Correct 64-bit signature
        [DllImport("user32.dll", EntryPoint="GetWindowLong")]
        private static extern IntPtr GetWindowLongPtr32(IntPtr hWnd, int nIndex);
        
        [DllImport("user32.dll", EntryPoint="GetWindowLongPtr")]
        private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);
        
        [DllImport("user32.dll", EntryPoint="SetWindowLong")]
        private static extern IntPtr SetWindowLongPtr32(IntPtr hWnd, int nIndex, IntPtr dwNewLong);
        
        [DllImport("user32.dll", EntryPoint="SetWindowLongPtr")]
        private static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

        // Wrapper to auto-select 32/64
        public static IntPtr GetWindowLong(IntPtr hWnd, int nIndex)
        {
            if (IntPtr.Size == 8) return GetWindowLongPtr64(hWnd, nIndex);
            else return GetWindowLongPtr32(hWnd, nIndex);
        }

        public static IntPtr SetWindowLong(IntPtr hWnd, int nIndex, IntPtr dwNewLong)
        {
             if (IntPtr.Size == 8) return SetWindowLongPtr64(hWnd, nIndex, dwNewLong);
             else return SetWindowLongPtr32(hWnd, nIndex, dwNewLong);
        }
        
        const int GWL_STYLE = -16;
        const long WS_CHILD = 0x40000000;
        const long WS_POPUP = 0x80000000;

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
                    if (args[i].StartsWith("/parent:")) {
                        long val = long.Parse(args[i].Substring(8));
                        parentHwnd = new IntPtr(val);
                    }
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
                this.WindowState = FormWindowState.Normal;

                // Initialize RDP Control dynamically
                rdpClient = new NativeRdpClient();
                this.Controls.Add(rdpClient);
                rdpClient.Dock = DockStyle.Fill;
                
                // OCX Access
                rdpClient.CreateControl();
                dynamic ocx = rdpClient.GetOcx();

                ocx.Server = host;
                ocx.UserName = user;
                var advanced = ocx.AdvancedSettings7;
                advanced.ClearTextPassword = pass;
                advanced.EnableCredSspSupport = true;
                advanced.PublicMode = false;
                advanced.SmartSizing = true; // IMPORTANT for resize
                
                ocx.Connect();
                
                // EMBEDDING LOGIC
                if (parentHwnd != IntPtr.Zero)
                {
                    this.Load += (s, e) => {
                        // 1. Remove Popup style, Add Child style
                        IntPtr currentStylePtr = GetWindowLong(this.Handle, GWL_STYLE);
                        long currentStyle = currentStylePtr.ToInt64();
                        long newStyle = (currentStyle & ~WS_POPUP) | WS_CHILD;
                        
                        SetWindowLong(this.Handle, GWL_STYLE, new IntPtr(newStyle));
                        
                        // 2. Set Parent
                        IntPtr result = SetParent(this.Handle, parentHwnd);
                        
                        if (result == IntPtr.Zero) {
                            // If embedding fails, try to act as a synced overlay at least
                            // MessageBox.Show("Failed to embed window. Running detached.");
                        }
                    };
                    
                    // Force resize on load to fill parent? No, listener needed.
                    // But SmartSizing=true handles internal resize.
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("RDP Error: " + ex.Message);
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
