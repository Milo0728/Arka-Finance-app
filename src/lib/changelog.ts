/**
 * Patch notes catalogue. Keys are the same string format as `APP_VERSION`.
 *
 * Design choices:
 *   - Text lives as plain strings (not translation keys) to keep the catalogue
 *     authorable without round-tripping through `messages/*.json`. If the
 *     product goes fully multilingual on release notes, swap `items: string[]`
 *     for `items: { en: string; es: string; fr: string }` — everything else
 *     keeps working.
 *   - We cap `items.length` by convention in the UI (5-7), not here. The data
 *     stays authoritative; truncation is a rendering concern.
 *   - `getChangelog(version)` falls back to null when the version is missing,
 *     so the modal can no-op instead of showing a broken empty card.
 */
export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogEntry {
  title: string;
  sections: ChangelogSection[];
}

export const CHANGELOG: Record<string, ChangelogEntry> = {
  "1.0.1": {
    title: "Novedades en Arka Finance",
    sections: [
      {
        title: "✨ Nuevas funciones",
        items: [
          "Ahora puedes separar tu dinero por cuenta real: banco, efectivo, billetera digital o la que uses.",
          "Comparación de cuentas: mira lado a lado cuál genera más ingresos, cuál consume más y dónde ahorras mejor.",
          "Un filtro de cuenta disponible en toda la app — resumen, gastos, ingresos, informes y análisis responden al instante.",
          "Cargá tus movimientos desde un archivo CSV o Excel en segundos.",
          "Extractos bancarios: prueba la importación directa. En fase beta, puede requerir ajustes manuales en algunos bancos.",
        ],
      },
      {
        title: "⚡ Mejoras",
        items: [
          "Quick Add entiende varias transacciones a la vez: escribe \"20 almuerzo, 50 gasolina\" y listo.",
          "Las suscripciones se detectan aunque escribas el nombre con pequeños errores (\"netflx\" → Netflix).",
          "Análisis más útiles: te mostramos solo lo que realmente marca una diferencia, sin ruido.",
          "La app se siente más rápida al cambiar de sección y al trabajar con muchos movimientos.",
        ],
      },
      {
        title: "🌍 Soporte financiero",
        items: [
          "Nuevas monedas: Lempira hondureño (HNL) y Quetzal guatemalteco (GTQ).",
          "Conversión automática entre monedas: registra en la que quieras y velo todo en tu moneda preferida.",
        ],
      },
      {
        title: "🔗 Suscripciones",
        items: [
          "Al registrar un gasto de Netflix, Spotify u otra suscripción, Arka la vincula sola.",
          "Detectamos pagos que se repiten mes a mes y te sugerimos convertirlos en suscripción.",
          "Si pagas una misma suscripción desde cuentas distintas, la reconocemos igual.",
        ],
      },
      {
        title: "🐛 Correcciones",
        items: [
          "Experiencia móvil pulida: números largos, tarjetas y encabezados ya no se salen de pantalla.",
          "Al crear un ingreso o gasto, siempre queda asignado a la cuenta que elegiste.",
          "Más precisión al calcular promedios, comparaciones y totales por suscripción.",
        ],
      },
    ],
  },
};

/** Safely fetch release notes for a version. Null when we haven't shipped an
 *  entry for it — the UI should treat that as "nothing to show". */
export function getChangelog(version: string): ChangelogEntry | null {
  return CHANGELOG[version] ?? null;
}
