#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
АИС "ТеплоХимЛаб" — Серверное приложение лаборатории водно-химического режима котельной
Разработчик: Коновалов Павел Сергеевич (группа ИСП-431)
Специальность: 09.02.07 "Информационные системы и программирование"
ГБПОУ НСО "Новосибирский электромеханический колледж"
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.parse
import webbrowser
import threading
import time

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_FILE = os.path.join(DATA_DIR, 'database.json')

# Гарантируем наличие папки данных
os.makedirs(DATA_DIR, exist_ok=True)

def load_db():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "users": [
            {"id": 1, "username": "lab", "fullName": "Коновалов Павел Сергеевич", "role": "LAB", "roleName": "Инженер-химик (лаборант ВХР)", "active": True},
            {"id": 2, "username": "operator", "fullName": "Смирнова Анна Васильевна", "role": "OPERATOR", "roleName": "Начальник смены котельной", "active": True},
            {"id": 3, "username": "admin", "fullName": "Администратор системы", "role": "ADMIN", "roleName": "Администратор АИС", "active": True}
        ],
        "audit": [],
        "records": []
    }

def save_db(data):
    try:
        tmp_file = DB_FILE + '.tmp'
        with open(tmp_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_file, DB_FILE)
        return True
    except Exception as e:
        print(f"[ERROR] Ошибка сохранения базы данных: {e}", file=sys.stderr)
        return False

# Инициализируем файл БД при первом старте
if not os.path.exists(DB_FILE):
    save_db(load_db())

class BoilerLabHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Анти-кэш заголовки для мгновенного обновления интерфейса
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # REST API endpoints
        if path == '/api/health':
            self.send_json_response(200, {
                "status": "UP",
                "system": "ТеплоХимЛаб АИС ВХР",
                "developer": "Коновалов П.С., ИСП-431",
                "college": "ГБПОУ НСО НЭК"
            })
            return

        if path == '/api/users':
            db = load_db()
            self.send_json_response(200, db.get("users", []))
            return

        if path == '/api/audit':
            db = load_db()
            self.send_json_response(200, db.get("audit", []))
            return

        if path == '/api/backup':
            db = load_db()
            self.send_json_response(200, {
                "app": "TeploKhimLab",
                "version": "1.0",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "data": db
            })
            return

        # Иначе раздаем статические файлы (index.html, CSS, JS)
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if path == '/api/auth/login':
            username = payload.get('username', '').strip()
            password = payload.get('password', '').strip()
            db = load_db()
            users = db.get("users", [])
            user = next((u for u in users if u.get("username") == username), None)

            if not user:
                self.send_json_response(401, {"error": "Пользователь не найден"})
                return

            # Проверка пароля (поддержка динамических паролей зарегистрированных пользователей)
            expected_pass = user.get("passwordHash") or (f"{username}123" if username != "operator" else "op123")
            if password != expected_pass:
                self.send_json_response(401, {"error": "Неверный пароль"})
                return

            self.send_json_response(200, {
                "success": True,
                "token": f"token_{username}_{int(time.time())}",
                "user": user
            })
            return

        if path == '/api/users/register':
            db = load_db()
            users = db.get("users", [])
            username = payload.get("username", "").strip().lower()
            if not username:
                self.send_json_response(400, {"error": "Логин обязателен"})
                return
            if any(u.get("username", "").lower() == username for u in users):
                self.send_json_response(400, {"error": "Пользователь уже существует"})
                return
            new_id = max([u.get("id", 0) for u in users] or [0]) + 1
            new_user = {
                "id": new_id,
                "username": username,
                "passwordHash": payload.get("passwordHash") or payload.get("password") or f"{username}123",
                "fullName": payload.get("fullName", "Новый специалист"),
                "role": payload.get("role", "LAB"),
                "roleName": payload.get("roleName", "Инженер-химик (лаборант ВХР)"),
                "department": payload.get("department", "Котельный цех № 4"),
                "active": True,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S")
            }
            users.append(new_user)
            db["users"] = users
            # Запись в аудит
            audit_list = db.get("audit", [])
            audit_list.insert(0, {
                "id": int(time.time() * 1000),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "user": new_user["fullName"],
                "role": new_user["roleName"],
                "action": "Регистрация специалиста",
                "details": f"Зарегистрирован новый сотрудник {new_user['fullName']} ({new_user['department']})",
                "level": "success"
            })
            db["audit"] = audit_list[:300]
            save_db(db)
            self.send_json_response(201, {"success": True, "user": new_user})
            return

        if path == '/api/audit':
            db = load_db()
            audit_list = db.get("audit", [])
            new_entry = {
                "id": int(time.time() * 1000),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "user": payload.get("user", "Оператор"),
                "role": payload.get("role", "Лаборант"),
                "action": payload.get("action", "Действие"),
                "details": payload.get("details", ""),
                "level": payload.get("level", "info")
            }
            audit_list.insert(0, new_entry)
            db["audit"] = audit_list[:300]
            save_db(db)
            self.send_json_response(201, new_entry)
            return

        self.send_json_response(404, {"error": "API route not found"})

    def send_json_response(self, status_code, data):
        content = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    port = PORT
    for p in range(PORT, PORT + 10):
        try:
            httpd = socketserver.TCPServer(("", p), BoilerLabHandler)
            port = p
            break
        except OSError:
            continue
    else:
        print("[ERROR] Не удалось занять порт для сервера!", file=sys.stderr)
        return

    import socket
    local_ip = "localhost"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    print("=" * 70)
    print(" [*] АИС 'ТЕПЛОХИМЛАБ' — ЛАБОРАТОРИЯ ВОДНО-ХИМИЧЕСКОГО РЕЖИМА")
    print(" Предприятие: «Теплогенерирующая компания 1» (ООО «ТГК 1»)")
    print(" Колледж: ГБПОУ НСО 'НЭК' (ИСП-431, Коновалов П.С.)")
    print(f" [ПК] Компьютер:             http://localhost:{port}")
    print(f" [📱] Телефон (сеть Wi-Fi):   http://{local_ip}:{port}")
    print("=" * 70)
    print(" Для остановки сервера нажмите Ctrl + C в этом окне.")
    print("=" * 70)

    # Автоматическое открытие в браузере через 1 секунду
    def open_browser():
        time.sleep(1.2)
        webbrowser.open(f"http://localhost:{port}")

    threading.Thread(target=open_browser, daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nОстановка сервера ТеплоХимЛаб...")
        httpd.server_close()

if __name__ == '__main__':
    start_server()
