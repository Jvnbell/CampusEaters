import socket

PI_IP = "10.42.0.1"   
PORT = 5000

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect((PI_IP, PORT))

    print(s.recv(1024).decode())  # welcome message

    while True:
        cmd = input("Enter command: ")
        s.sendall((cmd + "\n").encode())

        response = s.recv(1024).decode()
        print("Response:", response)