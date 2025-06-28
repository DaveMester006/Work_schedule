# app.py

from flask import Flask, render_template, request, jsonify, send_from_directory
import altair as alt
import pandas as pd
import json

app = Flask(__name__)

# --- Függvény a kördiagram generálásához ---
def create_pie_chart_spec(planned_count, in_progress_count, completed_count):
    """
    Létrehoz egy Altair kördiagram specifikációt a projekt készültségéhez.
    A diagram most már figyelembe veszi a tervezett, folyamatban lévő és kész alprojekteket.

    Args:
        planned_count (int): A tervezett alprojektek száma.
        in_progress_count (int): A folyamatban lévő alprojektek száma.
        completed_count (int): Az elkészült alprojektek száma.
    Returns:
        dict: A Vega-Lite chart specifikációja JSON formátumban.
    """
    total_subprojects = planned_count + in_progress_count + completed_count
    
    completion_percentage = 0 # Alapértelmezett, ha nincs alprojekt

    data_values = []
    
    if total_subprojects == 0:
        data_values.append({'category': 'Nincs Alprojekt', 'value': 100, 'color_code': '#cccccc'})
    else:
        # Százalékok kiszámítása
        planned_percentage = (planned_count / total_subprojects) * 100
        in_progress_percentage = (in_progress_count / total_subprojects) * 100
        completed_percentage = (completed_count / total_subprojects) * 100
        
        completion_percentage = completed_percentage # A középső szöveghez a kész százalékot használjuk

        # Kategóriák hozzáadása, csak ha értékük nagyobb mint 0
        if completed_percentage > 0:
            data_values.append({'category': 'Kész', 'value': completed_percentage, 'color_code': '#264653'}) # Meglévő 'kesz' szín
        if in_progress_percentage > 0:
            data_values.append({'category': 'Folyamatban', 'value': in_progress_percentage, 'color_code': '#e9c46a'}) # Meglévő 'folyamatban' szín
        if planned_percentage > 0:
            data_values.append({'category': 'Tervezett', 'value': planned_percentage, 'color_code': '#2a9d8f'})  # Meglévő 'tervezett' szín

    data = pd.DataFrame(data_values)

    # Az Altair diagram elkészítése
    base = alt.Chart(data).encode(
        theta=alt.Theta("value", stack=True)
    )

    pie = base.mark_arc(outerRadius=100, innerRadius=60).encode(
        color=alt.Color("category", scale=alt.Scale(domain=[d['category'] for d in data_values], range=[d['color_code'] for d in data_values])),
        order=alt.Order("value", sort="descending"),
        tooltip=[
            alt.Tooltip("category", title="Státusz"),
            alt.Tooltip("value", title="Százalék", format=".1f")
        ]
    )

    # Szöveg hozzáadása a diagram közepére (teljes készültségi százalék)
    text = alt.Chart(pd.DataFrame({'percentage': [completion_percentage]})) \
        .mark_text(
            radius=0, # A kör közepén
            align="center",
            baseline="middle",
            fontSize=24,
            fontWeight="bold",
            color="#333"
        ) \
        .encode(
            text=alt.Text("percentage", format=".0f"), # Az elkészült százalékát írjuk ki egész számként
        )

    chart = alt.layer(pie, text).properties(
        title="Projekt Készültsége"
    )

    return chart.to_dict()

# --- Útvonalak a fájlok kiszolgálásához ---

@app.route('/')
def index():
    """
    Kiszolgálja a fő HTML fájlt.
    """
    print("Az index() függvény meghívásra került!")
    return send_from_directory('.', 'index.html')

@app.route('/script.js')
def serve_js():
    """
    Kiszolgálja a JavaScript fájlt.
    """
    return send_from_directory('.', 'script.js')

@app.route('/style.css')
def serve_css():
    """
    Kiszolgálja a CSS fájlt.
    """
    return send_from_directory('.', 'style.css')

# --- API útvonal a kördiagram generálásához ---

@app.route('/generate_pie_chart', methods=['POST'])
def generate_chart():
    """
    Fogadja a készültségi százalékot, generálja a kördiagram specifikációt,
    és visszaadja azt JSON formátumban.
    """
    data = request.get_json()
    planned = data.get('planned')
    in_progress = data.get('in_progress')
    completed = data.get('completed')

    if planned is None or in_progress is None or completed is None:
        return jsonify({"error": "Hiányzó 'planned', 'in_progress' vagy 'completed' adat."}), 400

    try:
        chart_spec = create_pie_chart_spec(planned, in_progress, completed)
        return jsonify(chart_spec) # JSON specifikációt adunk vissza
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Hiba a diagram generálásakor: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
