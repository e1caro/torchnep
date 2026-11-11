# FitQuest · Cómo ganar dinero

Diseño propuesto el 8-11-2026. Ya está implementado en **FitQuest Developer** (la app de pruebas del dueño, donde
comprar no cuesta nada). En la app pública todavía no aparece: antes hay que conectar Google Play Billing (ver el final).

## Qué hacen las apps parecidas

Precios aproximados que conozco (de 2025; no he podido abrir las tiendas desde aquí, conviene confirmarlos):

| App | Modelo | Gratis | De pago |
|---|---|---|---|
| Hevy | freemium + suscripción | registro completo, pocas rutinas | Pro ≈ 3 €/mes, ≈ 24 €/año, de por vida ≈ 75 €: rutinas ilimitadas, gráficas avanzadas |
| Strong | freemium + suscripción | 3 rutinas | Pro ≈ 5 €/mes, ≈ 30 €/año, de por vida: rutinas ilimitadas, estadísticas, calculadora de discos |
| Fitbod | suscripción con prueba | 3 entrenamientos | ≈ 13–16 €/mes, ≈ 80–96 €/año |
| Habitica (gamificada) | gratis + suscripción + gemas | todo el juego | suscripción ≈ 5 $/mes; gemas para objetos estéticos |
| Duolingo (gamificada) | gratis con anuncios + suscripción + gemas | todo el curso | Super ≈ 13 €/mes; gemas para protectores de racha y estética |

Lo que funciona en el sector:
- **Freemium**: lo esencial gratis y una suscripción con límites suaves.
- **Prueba gratis de 7 días en el plan anual**, que es el que más se vende.
- **Plan de por vida** para quien no quiere suscripciones.
- En las apps de juego, una **moneda premium solo para estética** (no para ganar).

## El modelo de FitQuest

**1. FitQuest Pro (suscripción).** Entrenar, registrar, mazmorras, misiones y amigos siguen siendo gratis.

| | Gratis | Pro |
|---|---|---|
| Rutinas propias | 3 | ilimitadas |
| Ejercicios propios | 5 | ilimitados |
| Fotos de comida valoradas al día | 1 | 5 |
| Progreso por ejercicio (1RM) | últimas 4 sesiones | todo el historial |
| Calendario de entrenamiento | 6 semanas | 18 semanas |
| Cofre mensual | — | 1.000 monedas |
| Foto de perfil Corona e insignia PRO | — | ✓ |

Precios:

| Plan | Precio | ID en Play Console |
|---|---|---|
| Mensual | 3,99 €/mes | `pro_month` (suscripción) |
| Anual (más popular) | 24,99 €/año (2,08 €/mes, ahorra un 48 %) | `pro_year`, con oferta de prueba de 7 días |
| De por vida | 59,99 € | `pro_life` (producto único, no consumible) |

Son precios intermedios entre Hevy y Strong, porque FitQuest añade el juego, la comunidad y la valoración de comidas.

**2. Gemas (moneda premium, consumible).**

| Paquete | Precio | ID |
|---|---|---|
| Paquete de inicio (una sola vez) | 1,99 € → 300 gemas + foto de perfil Corona | `starter` |
| 100 gemas | 0,99 € | `gems_100` |
| 550 gemas (+10 %) | 4,99 € | `gems_550` |
| 1.200 gemas (+20 %) | 9,99 € | `gems_1200` |

Con las gemas se puede comprar:
- monedas (100 gemas → 600; 500 → 3.500);
- un potenciador de XP doble durante 24 h (60 gemas);
- un objeto de la tienda al momento (su precio en monedas ÷ 5).

**Regla fija:** las gemas nunca compran apuestas, ruletas ni cofres con premio aleatorio. Así se evita lo que la ley y
Google tratan como «cajas de botín» y juego con dinero real; y la nota de la mazmorra no se puede comprar.

**3. Sin anuncios.** Es parte del atractivo («sin anuncios») y con estos números rinde más la suscripción.

### Estimación (orientativa)

Las apps de fitness freemium convierten entre un 2 % y un 5 % de los usuarios activos en suscriptores.

Con 1.000 usuarios activos al mes y un 3 % en Pro (la mayoría anual):
- 30 × ~2 €/mes ≈ **60 €/mes** brutos, más las gemas;
- Google se queda un 15 % (desde el primer euro en suscripciones y hasta 1 M$ al año en el resto);
- el IVA lo gestiona Google en la UE.

## Estado y lo que falta para cobrar de verdad

Hecho (`pay.js`, solo activo en FitQuest Developer):
- página de Pro con comparativa, planes y prueba gratis;
- tienda de gemas;
- límites de la versión gratuita con aviso amable;
- insignia PRO y cofre mensual;
- panel de developer en Ajustes: Pro activo, simular usuario gratuito, gemas y monedas infinitas, borrar compras y registro de compras de prueba.

Pendiente antes de activarlo en la app pública:
1. **Tú:** en Play Console › Monetizar, crea los productos con los IDs de arriba y configura tu perfil de pagos (Payments profile).
2. **Claude:** integrar la librería Google Play Billing en la app Android y verificar cada compra en el servidor
   (Supabase Edge Function con la API de Google Play Developer). Así Pro y las gemas se guardan en tu cuenta y no se pueden falsear.
3. Mostrar el precio real que devuelve Google, en la moneda de cada país, en lugar de los precios fijos.
4. Actualizar la política de privacidad y el formulario de seguridad de datos (historial de compras).
5. En la ficha de Play, marcar «Contiene compras en la aplicación».
