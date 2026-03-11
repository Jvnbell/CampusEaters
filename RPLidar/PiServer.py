import socket

PI_IP = "10.42.0.1"
PI_PORT = 5000

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect((PI_IP, PI_PORT))

    print(s.recv(1024).decode())
    print(s.recv(1024).decode())

    while True:
        cmd = input("Enter command: ").strip()
        if cmd.lower() in {"quit", "exit"}:
            break

        s.sendall((cmd + "\n").encode("utf-8"))

        s.settimeout(0.3)
        try:
            while True:
                reply = s.recv(1024)
                if not reply:
                    break
                print(reply.decode(), end="")
                if len(reply) < 1024:
                    break
        except socket.timeout:
            pass