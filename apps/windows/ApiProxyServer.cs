using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;

namespace AiSysadminDesktop
{
    public class ApiProxyServer
    {
        private HttpListener _listener;
        private readonly string _backendUrl = "https://testing.sentrait.com.uy";
        private readonly HttpClient _httpClient;
        private bool _isRunning;

        public ApiProxyServer()
        {
            var handler = new HttpClientHandler
            {
                AllowAutoRedirect = false, // We'll handle redirects manually to preserve POST body
                AutomaticDecompression = DecompressionMethods.All,
                ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
            };
            _httpClient = new HttpClient(handler);
        }

        public void Start(int port = 8080)
        {
            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add($"http://localhost:{port}/");
                _listener.Start();
                _isRunning = true;

                Debug.WriteLine($"✅ API Proxy running on http://localhost:{port}");
                
                Task.Run(() => ListenAsync());
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"❌ Failed to start proxy: {ex.Message}");
            }
        }

        private async Task ListenAsync()
        {
            while (_isRunning)
            {
                try
                {
                    var context = await _listener.GetContextAsync();
                    _ = Task.Run(() => HandleRequestAsync(context));
                }
                catch (Exception ex)
                {
                    if (_isRunning)
                    {
                        Debug.WriteLine($"❌ Proxy listen error: {ex.Message}");
                    }
                }
            }
        }

        private async Task HandleRequestAsync(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            MemoryStream bodyStream = null;
            HttpResponseMessage currentResponse = null;

            try
            {
                // Enable CORS
                response.AddHeader("Access-Control-Allow-Origin", "*");
                response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
                response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
                response.AddHeader("Access-Control-Max-Age", "86400");

                // Handle OPTIONS (preflight)
                if (request.HttpMethod == "OPTIONS")
                {
                    response.StatusCode = 204;
                    response.Close();
                    return;
                }

                // Build target URL
                string targetUrl = _backendUrl + request.Url.PathAndQuery;
                Debug.WriteLine($"🔷 Proxy: {request.HttpMethod} {targetUrl}");

                // Create initial proxy request
                var proxyRequest = new HttpRequestMessage
                {
                    Method = new HttpMethod(request.HttpMethod),
                    RequestUri = new Uri(targetUrl)
                };

                // Copy headers
                foreach (string headerName in request.Headers.AllKeys)
                {
                    if (headerName.Equals("Host", StringComparison.OrdinalIgnoreCase) ||
                        headerName.Equals("Connection", StringComparison.OrdinalIgnoreCase) ||
                        headerName.Equals("Origin", StringComparison.OrdinalIgnoreCase))
                        continue;

                    try
                    {
                        if (headerName.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                            headerName.Equals("Content-Length", StringComparison.OrdinalIgnoreCase) ||
                            headerName.Equals("Accept-Encoding", StringComparison.OrdinalIgnoreCase)) // Skip to let HttpClient handle it
                            continue;

                        proxyRequest.Headers.TryAddWithoutValidation(headerName, request.Headers[headerName]);
                    }
                    catch { }
                }

                // Handle Body
                string contentType = request.ContentType ?? "application/json";
                if (request.HttpMethod == "POST" || request.HttpMethod == "PUT" || request.HttpMethod == "PATCH")
                {
                    bodyStream = new MemoryStream();
                    await request.InputStream.CopyToAsync(bodyStream);
                    bodyStream.Position = 0;
                    
                    proxyRequest.Content = new StreamContent(bodyStream);
                    proxyRequest.Content.Headers.TryAddWithoutValidation("Content-Type", contentType);
                }

                // Execute with Redirect Loop
                int redirectCount = 0;
                const int MaxRedirects = 5;
                HttpRequestMessage currentRequest = proxyRequest;

                while (redirectCount < MaxRedirects)
                {
                    currentResponse = await _httpClient.SendAsync(currentRequest);
                    int statusCode = (int)currentResponse.StatusCode;

                    // Check for redirect (300-399) and Location header
                    if (statusCode >= 300 && statusCode <= 399 && currentResponse.Headers.Location != null)
                    {
                        redirectCount++;
                        var redirectUrl = currentResponse.Headers.Location.IsAbsoluteUri 
                            ? currentResponse.Headers.Location.ToString()
                            : _backendUrl + currentResponse.Headers.Location.ToString();
                            
                        Debug.WriteLine($"🔄 Redirecting ({statusCode}) [{redirectCount}/{MaxRedirects}] to: {redirectUrl}");
                        
                        // Dispose previous response
                        if (redirectCount > 0) currentResponse.Dispose(); 

                        // Create new request
                        var nextRequest = new HttpRequestMessage
                        {
                            Method = new HttpMethod(request.HttpMethod), // Maintain original method
                            RequestUri = new Uri(redirectUrl)
                        };

                        // Reuse Body
                        if (bodyStream != null && bodyStream.Length > 0)
                        {
                            bodyStream.Position = 0; // REWIND STREAM
                            nextRequest.Content = new StreamContent(bodyStream);
                            nextRequest.Content.Headers.TryAddWithoutValidation("Content-Type", contentType);
                        }
                        
                        // Copy headers again
                        foreach (var header in proxyRequest.Headers)
                        {
                            nextRequest.Headers.TryAddWithoutValidation(header.Key, header.Value);
                        }
                        
                        currentRequest = nextRequest;
                        continue;
                    }

                    // Not a redirect
                    break;
                }

                await WriteResponse(response, currentResponse);
            }
            catch (HttpRequestException hex)
            {
                Debug.WriteLine($"❌ HTTP Error: {hex.Message}");
                response.StatusCode = 502;
                byte[] buffer = Encoding.UTF8.GetBytes($"{{\"error\": \"Backend connection failed: {hex.Message}\"}}");
                response.ContentType = "application/json";
                try { await response.OutputStream.WriteAsync(buffer, 0, buffer.Length); response.Close(); } catch {}
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"❌ Proxy error: {ex.Message}");
                response.StatusCode = 500;
                byte[] buffer = Encoding.UTF8.GetBytes($"{{\"error\": \"{ex.Message}\"}}");
                response.ContentType = "application/json";
                try { await response.OutputStream.WriteAsync(buffer, 0, buffer.Length); response.Close(); } catch {}
            }
            finally
            {
                if (currentResponse != null) currentResponse.Dispose();
                if (bodyStream != null) bodyStream.Dispose();
            }
        }

        private async Task WriteResponse(HttpListenerResponse response, HttpResponseMessage proxyResponse)
        {
            try 
            {
                response.StatusCode = (int)proxyResponse.StatusCode;

                // Determine effective Content-Type
                string contentType = "application/json"; // Default
                if (proxyResponse.Content.Headers.ContentType != null)
                {
                    contentType = proxyResponse.Content.Headers.ContentType.ToString();
                }
                response.ContentType = contentType;

                // Buffer the content to memory to ensure it's fully decompressed and we know the length
                byte[] responseBytes;
                using (var memoryStream = new MemoryStream())
                {
                    await proxyResponse.Content.CopyToAsync(memoryStream);
                    responseBytes = memoryStream.ToArray();
                }

                // Set content length explicitly
                response.ContentLength64 = responseBytes.Length;

                // Log decompression status for debugging
                if (proxyResponse.Content.Headers.Contains("Content-Encoding"))
                {
                    string enc = string.Join(", ", proxyResponse.Content.Headers.GetValues("Content-Encoding"));
                    Debug.WriteLine($"⚠️ Backend response is STILL compressed: {enc}");
                }

                // Prevent any compression/encoding headers from leaking tailored for the original compressed stream
                response.Headers.Remove("Content-Encoding");
                response.Headers.Remove("Transfer-Encoding");

                Debug.WriteLine($"✅ Proxy Response: {response.StatusCode} | Type: {contentType} | Size: {response.ContentLength64} bytes");

                // Write body
                await response.OutputStream.WriteAsync(responseBytes, 0, responseBytes.Length);
                response.Close();
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"❌ WriteResponse Error: {ex.Message}");
                try { response.Close(); } catch { }
            }
        }

        public void Stop()
        {
            _isRunning = false;
            _listener?.Stop();
            _listener?.Close();
            _httpClient?.Dispose();
        }
    }
}
