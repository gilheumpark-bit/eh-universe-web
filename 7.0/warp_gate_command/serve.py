from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os


def main() -> None:
    root = Path(__file__).resolve().parent
    os.chdir(root)
    host = "127.0.0.1"
    port = 8047
    server = ThreadingHTTPServer((host, port), SimpleHTTPRequestHandler)
    print(f"EH Warp Gate Command is serving at http://{host}:{port}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
