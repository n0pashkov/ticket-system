import sqlite3

# Подключаемся к базе данных
conn = sqlite3.connect('ticket_system.db')
cursor = conn.cursor()

# Проверяем структуру таблицы tickets
cursor.execute("PRAGMA table_info(tickets)")
columns = cursor.fetchall()
column_names = [col[1] for col in columns]

print("Столбцы таблицы tickets:")
for name in column_names:
    print(f"- {name}")

# Проверяем наличие нужного столбца
if 'is_hidden_for_creator' in column_names:
    print("\nСтолбец is_hidden_for_creator уже существует!")
else:
    print("\nСтолбец is_hidden_for_creator отсутствует. Добавляем...")
    cursor.execute("ALTER TABLE tickets ADD COLUMN is_hidden_for_creator BOOLEAN DEFAULT 0")
    conn.commit()
    print("Столбец успешно добавлен!")

# Закрываем соединение
conn.close() 