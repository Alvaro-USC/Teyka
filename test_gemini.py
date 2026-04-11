import os
import sys
import requests
import json

def load_env_key():
    try:
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                if line.lower().startswith('key='):
                    return line.split('=', 1)[1].strip()
    except FileNotFoundError:
        pass
    print("⚠️ Error: Archivo .env no encontrado en el directorio actual, o no contiene 'key='")
    return None

def test_gemini(hobbies_list):
    api_key = load_env_key()
    if not api_key:
        sys.exit(1)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    hobbies_str = ", ".join(hobbies_list)
    prompt = f'El usuario tiene un alto nivel de estrés. Sus hobbies guardados son: {hobbies_str}. Escribe una única frase corta (máximo 8 o 10 palabras), directa y amable, sugiriendo una actividad concreta y realista basada en estos hobbies para que se relaje ahora mismo. No des explicaciones ni uses comillas ni signos de puntuación finales, solo el predicado. Ejemplo: "escuchar un álbum completo de tu artista favorito" o "salir a andar por el parque".'

    print(f"[*] Enviando prompt a Gemini 2.5 Flash con {len(hobbies_list)} hobbies...")
    print(f"[*] Prompt format: {prompt}")

    headers = {'Content-Type': 'application/json'}
    data = {
        'contents': [{
            'parts': [{'text': prompt}]
        }]
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 200:
            result = response.json()
            ai_text = result['candidates'][0]['content']['parts'][0]['text']
            # Limpiamos puntos y comillas igual que hace mobile.js
            clean_text = ai_text.strip().strip('.¡!¿?"\'').lower()
            print("\n[OK] EXITO HTTP 200")
            print(f"Texto Generado Puro: {ai_text}")
            print(f"Texto Formateado UI: {clean_text}")
        else:
            print(f"\n[X] ERROR HTTP {response.status_code}")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
            
    except Exception as e:
        print(f"\n[!] EXCEPCION DE RED: {e}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python test_gemini.py <hobby1> <hobby2> ...")
        print('Ejemplo: python test_gemini.py "leer libros" "tocar piano"')
        sys.exit(1)
        
    test_gemini(sys.argv[1:])
