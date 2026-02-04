using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Collections.Generic;

namespace RdpHost
{
    // RDP Client wraper expecting a specific CLSID
    public class NativeRdpClient : AxHost
    {
        public NativeRdpClient(string clsid) : base(clsid) 
        {
        }
    }

    public class RdpForm : Form
    {
        private NativeRdpClient rdpClient;
        
        [DllImport("user32.dll", SetLastError = true)]
        static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);
        
        [DllImport("user32.dll", EntryPoint="GetWindowLong")]
        private static extern IntPtr GetWindowLongPtr32(IntPtr hWnd, int nIndex);
        
        [DllImport("user32.dll", EntryPoint="GetWindowLongPtr")]
        private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);
        
        [DllImport("user32.dll", EntryPoint="SetWindowLong")]
        private static extern IntPtr SetWindowLongPtr32(IntPtr hWnd, int nIndex, IntPtr dwNewLong);
        
        [DllImport("user32.dll", EntryPoint="SetWindowLongPtr")]
        private static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

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

        // List of CLSIDs to try (Newest -> Oldest)
        static readonly string[] RDP_CLSIDS = new string[] {
            // MsRdpClient9NotSafeForScripting (Windows 10/11 standard)
            "54d38bf7-b1ef-4479-9674-1bd6ea465258", 
            // MsRdpClient7
            "9059f30f-4eb1-4bd2-9fdc-36f43a218f4a",
            // MsTscAx Generic (Old reliable fallback)
            "7cacbd7b-0d99-468f-ac33-22e495c0afe5" 
        };

        public RdpForm(string[] args)
        {
            try
            {
                // Parse arguments
                string host = "", user = "", pass = "";
                int width = 800, height = 600;
                int x = 0, y = 0; // Default to 0,0
                IntPtr parentHwnd = IntPtr.Zero;

                for (int i = 0; i < args.Length; i++)
                {
                    if (args[i].StartsWith("/parent:")) {
                        try { parentHwnd = new IntPtr(long.Parse(args[i].Substring(8))); } catch {}
                    }
                    if (args[i].StartsWith("/v:")) host = args[i].Substring(3);
                    if (args[i].StartsWith("/u:")) user = args[i].Substring(3);
                    if (args[i].StartsWith("/p:")) pass = args[i].Substring(3);
                    if (args[i].StartsWith("/w:")) try { width = int.Parse(args[i].Substring(3)); } catch {}
                    if (args[i].StartsWith("/h:")) try { height = int.Parse(args[i].Substring(3)); } catch {}
                    if (args[i].StartsWith("/x:")) try { x = int.Parse(args[i].Substring(3)); } catch {}
                    if (args[i].StartsWith("/y:")) try { y = int.Parse(args[i].Substring(3)); } catch {}
                }

                // Window Setup
                this.FormBorderStyle = FormBorderStyle.None;
                this.StartPosition = FormStartPosition.Manual; // Essential for manual positioning
                this.Location = new Point(x, y);
                this.Width = width;
                this.Height = height;
                this.BackColor = Color.Black;
                this.ShowInTaskbar = false;
                
                // --- SMART INIT LOOP ---
                bool success = false;
                dynamic ocx = null;

                foreach (var clsid in RDP_CLSIDS)
                {
                    try 
                    {
                        // Dispose previous attempt if any
                        if (rdpClient != null) {
                            this.Controls.Remove(rdpClient);
                            rdpClient.Dispose();
                        }

                        // Try initializing
                        rdpClient = new NativeRdpClient(clsid);
                        rdpClient.BeginInit(); // AxHost lifecycle
                        this.Controls.Add(rdpClient);
                        rdpClient.Dock = DockStyle.Fill;
                        rdpClient.EndInit();
                        rdpClient.CreateControl();

                        // Try getting the OCX interface
                        ocx = rdpClient.GetOcx();
                        
                        // Validate
                        if (ocx != null) 
                        {
                            // Try accessing a property to ensure binding works
                            var test = ocx.Server; 
                            success = true;
                            // Console.WriteLine("Initialized with CLSID: " + clsid);
                            break; 
                        }
                    }
                    catch 
                    {
                        // Failed, try next
                        continue;
                    }
                }

                if (!success || ocx == null)
                {
                    MessageBox.Show("Error: No compatible RDP Client found (ActiveX). Please update Windows.");
                    Application.Exit();
                    return;
                }

                // Configure RDP
                ocx.Server = host;
                ocx.UserName = user;
                
                // Advanced settings handling (try/catch for individual props as they vary by version)
                try {
                    var advanced = ocx.AdvancedSettings7;
                    if (advanced != null) {
                        advanced.ClearTextPassword = pass;
                        advanced.EnableCredSspSupport = true;
                        advanced.PublicMode = false;
                        advanced.SmartSizing = true;
                    }
                } catch {
                     // Try older interface if AdvancedSettings7 fails
                     try { ocx.AdvancedSettings2.ClearTextPassword = pass; } catch {}
                }
                
                ocx.Connect();
                
                // EMBEDDING (SetParent)
                if (parentHwnd != IntPtr.Zero)
                {
                    this.Load += (s, e) => {
                        try {
                            IntPtr currentStylePtr = GetWindowLong(this.Handle, GWL_STYLE);
                            long currentStyle = currentStylePtr.ToInt64();
                            long newStyle = (currentStyle & ~WS_POPUP) | WS_CHILD;
                            
                            SetWindowLong(this.Handle, GWL_STYLE, new IntPtr(newStyle));
                            SetParent(this.Handle, parentHwnd);
                        } catch (Exception ex) {
                            MessageBox.Show("Embedding Error: " + ex.Message);
                        }
                    };
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Critical RDP Error: " + ex.Message);
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
