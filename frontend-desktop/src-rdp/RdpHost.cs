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

        // Class level OCX
        private dynamic ocx;
        private System.Windows.Forms.Timer resizeTimer;

        public RdpForm(string[] args)
        {
            try
            {
                // Init Resize Timer
                resizeTimer = new System.Windows.Forms.Timer();
                resizeTimer.Interval = 1000; // Wait 1s after resize ends (Debounce)
                resizeTimer.Tick += (s, e) => {
                    resizeTimer.Stop();
                    // RECONNECT STRATEGY (Like mRemoteNG)
                    // This is the only checks-and-balances way to guarantee native resolution update
                    try {
                        if (ocx != null && this.Width > 100 && this.Height > 100) {
                             // Check if size actually changed significantly to avoid loops
                             // Can't easily check current desktop width without casting, so we just do it.
                             
                             // 1. Disconnect
                             try { 
                                if (ocx.Connected == 1) ocx.Disconnect(); 
                             } catch {}
                             
                             // 2. Update Resolution
                             try {
                                 ocx.DesktopWidth = this.Width;
                                 ocx.DesktopHeight = this.Height;
                             } catch {}
                             
                             // 3. Reconnect
                             ocx.Connect();
                        }
                    } catch {}
                };

                this.Resize += (s, e) => {
                    resizeTimer.Stop();
                    resizeTimer.Start();
                };

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
                // dynamic ocx = null; // MOVED TO CLASS FIELD

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
                
                // OVERLAY MODE (No SetParent)
                // The main Rust app will handle positioning via SetWindowPos in a sync loop.
                // We just need to ensure we are a clean, borderless window.
                
                // Force initial position
                this.Location = new Point(x, y);
                
                // Z-ORDER & OWNERSHIP FIX
                // Instead of TopMost=true (which covers everything), we set the Owner.
                // This makes this window sit always on top of the Owner, but below other apps.
                if (parentHwnd != IntPtr.Zero) {
                    try {
                        // Set Owner (GWL_HWNDPARENT)
                        SetWindowLong(this.Handle, -8, parentHwnd); // GWL_HWNDPARENT = -8
                    } catch {}
                }
                
                this.Show();
                // this.BringToFront(); // Let the Owner relationship handle z-order

                // SUICIDE PACT: Monitor Parent Process
                // If parent argument was passed, we watch it.
                int parentPid = 0;
                foreach(string a in args) {
                     if (a.StartsWith("/parent_pid:")) {
                         try { parentPid = int.Parse(a.Substring(12)); } catch {}
                     }
                }

                if (parentPid > 0) {
                     System.Windows.Forms.Timer stayAliveTimer = new System.Windows.Forms.Timer();
                     stayAliveTimer.Interval = 500;
                     stayAliveTimer.Tick += (s, e) => {
                         try {
                             System.Diagnostics.Process p = System.Diagnostics.Process.GetProcessById(parentPid);
                             if (p == null || p.HasExited) {
                                 Application.Exit(); // Die if parent is gone
                             }
                         } catch {
                             // If GetProcessById throws, process is likely gone or inaccessible
                             Application.Exit();
                         }
                     };
                     stayAliveTimer.Start();
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
        [DllImport("user32.dll")]
        private static extern bool SetProcessDPIAware();

        [STAThread]
        static void Main(string[] args)
        {
            try {
                SetProcessDPIAware(); 
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new RdpForm(args));
            } catch (Exception ex) {
                MessageBox.Show("FATAL ERROR: " + ex.ToString());
            }
        }
    }
}
