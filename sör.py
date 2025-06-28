import pandas as pd
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression

# Excel fájl beolvasása
df = pd.read_excel('sör.xlsx')

# Speciális karakterek kódolása
encoding = 'utf-8'

# Oszlopok ellenőrzése
print(df.columns)

# A hazai sör fogyasztás ábrázolása az év függvényében
fig, (ax1, ax2) = plt.subplots(nrows=1, ncols=2, figsize=(12, 5))

# Vonaldiagram
df.plot(x='Év', y='Hazai fogyasztás összesen millió liter', kind='line', marker='o', ax=ax1, label='Vonaldiagram')
ax1.set_title('Hazai fogyasztás összesen millió liter (Vonaldiagram)')
ax1.set_xlabel('Év')
ax1.set_ylabel('Fogyasztás (millió liter)')
ax1.grid(True)

# Lineáris regresszió
X = df[['Év']]
y = df['Hazai fogyasztás összesen millió liter']
model = LinearRegression()
model.fit(X, y)

# Predikció a teljes X tartományra
X_range = pd.DataFrame({'Év': [df['Év'].min(), df['Év'].max()]})
y_pred = model.predict(X_range)

# Lineáris regresszió diagram, jelmagyarázat
ax1.plot(X_range, y_pred, color='red', linewidth=3, label='Lineáris regresszió')
ax1.legend()

# Pontdiagram
ax2.scatter(df['Év'], df['Hazai fogyasztás összesen millió liter'], color='red', label='Pontdiagram')
ax2.set_title('Hazai fogyasztás összesen millió liter (Pontdiagram)')
ax2.set_xlabel('Év')
ax2.set_ylabel('Fogyasztás (millió liter)')
ax2.grid(True)

#A lineáris regresszió paramétereinek kiiratása
print(f'Hajlásszög (m): {model.coef_[0]:.4f}')
print(f'Intercept (b): {model.intercept_:.4f}')
plt.show()