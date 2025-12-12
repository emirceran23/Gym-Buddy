import json
import re

# Python dosyasını oku
with open(r'c:\Users\ITEMS\Desktop\can-eye\Gym-Buddy\scripts\video_angle_extractor.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Notebook yapısı
notebook = {
    "cells": [],
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "name": "python",
            "version": "3.10.0"
        },
        "colab": {
            "provenance": []
        }
    },
    "nbformat": 4,
    "nbformat_minor": 0
}

# Dosyayı satırlara böl
lines = content.split('\n')

current_cell = []
current_type = "code"
in_docstring = False
docstring_content = []

i = 0
while i < len(lines):
    line = lines[i]
    
    # Docstring başlangıcı (markdown hücre)
    if line.strip().startswith('"""') and not in_docstring:
        # Mevcut code hücresini kaydet
        if current_cell:
            notebook["cells"].append({
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": current_cell
            })
            current_cell = []
        
        # Docstring'i topla
        in_docstring = True
        docstring_line = line.strip()[3:]  # """ kaldır
        
        # Tek satırlık docstring kontrolü
        if docstring_line.endswith('"""'):
            docstring_line = docstring_line[:-3]
            docstring_content = [docstring_line + '\n']
            in_docstring = False
            # Markdown hücre ekle
            notebook["cells"].append({
                "cell_type": "markdown",
                "metadata": {},
                "source": docstring_content
            })
            docstring_content = []
        else:
            if docstring_line:
                docstring_content.append(docstring_line + '\n')
    
    # Docstring bitişi
    elif in_docstring:
        if line.strip().endswith('"""'):
            # Son satırı ekle (""" hariç)
            last_line = line.strip()[:-3]
            if last_line:
                docstring_content.append(last_line + '\n')
            in_docstring = False
            # Markdown hücre ekle
            notebook["cells"].append({
                "cell_type": "markdown",
                "metadata": {},
                "source": docstring_content
            })
            docstring_content = []
        else:
            docstring_content.append(line + '\n')
    
    # Normal kod satırı
    else:
        # ! işaretli satırlar (pip install) ayrı hücre
        if line.strip().startswith('!'):
            if current_cell:
                notebook["cells"].append({
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": current_cell
                })
                current_cell = []
            
            notebook["cells"].append({
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": [line + '\n']
            })
        else:
            current_cell.append(line + '\n')
    
    i += 1

# Son hücreyi ekle
if current_cell:
    notebook["cells"].append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": current_cell
    })

# Notebook'u kaydet
output_path = r'c:\Users\ITEMS\Desktop\can-eye\Gym-Buddy\scripts\ML_Training_Professional.ipynb'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(notebook, f, indent=2, ensure_ascii=False)

print(f"✅ Notebook oluşturuldu: {output_path}")
print(f"   Toplam hücre sayısı: {len(notebook['cells'])}")
