import sqlite3

def create_ticket_messages_table():
    """
    Создает таблицу для сообщений к заявкам
    """
    conn = sqlite3.connect('ticket_system.db')
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ticket_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (ticket_id) REFERENCES tickets (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    conn.commit()
    conn.close()
    print("Таблица ticket_messages создана успешно")

if __name__ == "__main__":
    create_ticket_messages_table() 