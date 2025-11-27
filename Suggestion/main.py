import pandas as pd

# 1. Dataseti yükle
df = pd.read_csv("data/GYM.csv")

# 2. Kullanıcıdan girdileri al
gender_input = input("Cinsiyet (e.g. Male, Female): ").strip()

height_input = input("Boy (e.g. 160, 195): ").strip()
weight_input = input("Kilo (e.g. 60, 90): ").strip()
bmi = float(weight_input) / ((float(height_input) / 100) ** 2)
if bmi < 18.5:
    bmi_category = "Underweight"
elif 18.5 <= bmi < 24.9:
    bmi_category = "Normal weight"
elif 25 <= bmi < 29.9:
    bmi_category = "Overweight"
else:
    bmi_category = "Obesity"

goal_input = input("Amaç (e.g. muscle_gain, fat_burn): ").strip()

# 3. Eşleşen satırları filtrele
matches = df[
    (df["Gender"] == gender_input) &
    (df["Goal"] == goal_input) &
    (df["BMI Category"] == bmi_category)
]

# 4. Tavsiyeleri göster
if matches.empty:
    print("\nGirdileriniz için eşleşme bulunamadi.")
    print("Yazim hatalarini kontrol edin veya datasette gördüğünüz değerleri kullanmayi deneyin.")
else:
    print(f"\nKullanicilarimizin %{len(matches)/len(df)*100:.2f} sizin gibi. ({len(matches)}/{len(df)})\n")

    # Bütün tavsiyeler aynı olduğu için sadece ilk tavsiyeyi basmak yeterli
    print("Onerilen Egzersiz Programi:")
    print(matches.iloc[0]["Exercise Schedule"])
    print("\nOnerilen Yemek Plani:")
    print(matches.iloc[0]["Meal Plan"])
    print()
