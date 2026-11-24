"""Tablas de evaluación para la terminal; no cambia predicciones ni modelos."""

from sklearn.metrics import accuracy_score, classification_report, confusion_matrix


def _table(headers, rows):
    values = [[str(cell) for cell in row] for row in [headers, *rows]]
    widths = [max(len(row[column]) for row in values) for column in range(len(headers))]
    border = '+' + '+'.join('-' * (width + 2) for width in widths) + '+'
    lines = [border]
    for index, row in enumerate(values):
        lines.append('| ' + ' | '.join(value.ljust(width) for value, width in zip(row, widths)) + ' |')
        if index == 0:
            lines.append(border)
    lines.append(border)
    return '\n'.join(lines)


def format_case_table(messages, expected, predicted, *, row_numbers=None,
                      expected_priorities=None, predicted_priorities=None):
    messages, expected, predicted = list(messages), list(expected), list(predicted)
    count = len(messages)
    if not count or len(expected) != count or len(predicted) != count:
        raise ValueError('Se requieren mensajes, referencias y predicciones del mismo tamaño no vacío.')
    numbers = list(range(1, count + 1)) if row_numbers is None else list(row_numbers)
    if len(numbers) != count:
        raise ValueError('La cantidad de filas no coincide con los casos.')
    if (expected_priorities is None) != (predicted_priorities is None):
        raise ValueError('Se requieren ambas listas de prioridades.')
    priorities = expected_priorities is not None
    if priorities:
        expected_priorities, predicted_priorities = list(expected_priorities), list(predicted_priorities)
        if len(expected_priorities) != count or len(predicted_priorities) != count:
            raise ValueError('La cantidad de prioridades no coincide con los casos.')
    headers = ['Fila CSV', 'Mensaje abreviado', 'Cat. real', 'Cat. pred.']
    if priorities:
        headers += ['Prio. real', 'Prio. pred.']
    headers.append('Acierto')
    rows, correct = [], 0
    for i, message in enumerate(messages):
        text = ' '.join(str(message).split())
        short = text if len(text) <= 44 else text[:41] + '...'
        row = [numbers[i], short, expected[i], predicted[i]]
        matches = expected[i] == predicted[i]
        if priorities:
            row += [expected_priorities[i], predicted_priorities[i]]
            matches = matches and expected_priorities[i] == predicted_priorities[i]
        correct += int(matches)
        rows.append([*row, 'Si' if matches else 'No'])
    scope = 'categoria y prioridad juntas' if priorities else 'categoria'
    return (f'=== Resultados por caso: {count} ejemplos de prueba ===\n'
            + _table(headers, rows)
            + f'\nAciertos ({scope}): {correct}/{count}; errores: {count - correct}.'
            + (f'\nAccuracy conjunta: {correct / count:.2%} ({correct}/{count})' if priorities else '')
            + '\nFila CSV cuenta registros de datos, sin el encabezado. El CSV conserva el mensaje completo.')


def format_metrics_report(expected, predicted, labels, *, target='categoria'):
    expected, predicted, labels = list(expected), list(predicted), list(labels)
    if not expected or len(expected) != len(predicted):
        raise ValueError('Se requieren referencias y predicciones del mismo tamaño no vacío.')
    if set(expected + predicted) - set(labels):
        raise ValueError('Hay etiquetas fuera de las categorias indicadas.')
    report = classification_report(expected, predicted, labels=labels, output_dict=True, zero_division=0)
    rows = []
    for label in [*labels, 'macro avg', 'weighted avg']:
        scores = report[label]
        rows.append([label, f"{scores['precision']:.3f}", f"{scores['recall']:.3f}", f"{scores['f1-score']:.3f}", int(scores['support'])])
    correct = sum(a == b for a, b in zip(expected, predicted))
    matrix = confusion_matrix(expected, predicted, labels=labels)
    matrix_rows = [[label, *matrix[index].tolist()] for index, label in enumerate(labels)]
    return (f'=== Metricas de {target} ===\n'
            + f'Casos evaluados: {len(expected)}\n'
            + f'Accuracy: {accuracy_score(expected, predicted):.2%} ({correct}/{len(expected)})\n'
            + _table(['Clase', 'Precision', 'Recall', 'F1-score', 'Soporte'], rows)
            + '\nPrecision, recall y F1 se expresan entre 0 y 1. Soporte = ejemplos reales por clase.'
            + '\nMatriz de confusion: filas = reales, columnas = predichas.\n'
            + _table(['Real / Pred.', *labels], matrix_rows))
