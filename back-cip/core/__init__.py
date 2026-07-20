import socket

# Parche para forzar IPv4 en todas las conexiones de socket.
# Render a veces falla al intentar conectar por IPv6 a smtp.gmail.com
# lanzando "[Errno 101] Network is unreachable".
orig_getaddrinfo = socket.getaddrinfo

def getaddrinfo_ipv4(host, port, family=0, type=0, proto=0, flags=0):
    # Forzamos socket.AF_INET (IPv4)
    return orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)

socket.getaddrinfo = getaddrinfo_ipv4
