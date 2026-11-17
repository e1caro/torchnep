import { curve, genericCatalogue, type L, type Template } from './common';

const SIZES3: [string, string, number][] = [['', '', 1], ['large', 'grande', 1.25], ['small', 'pequeño', 0.8]];

export const cafe: Template = {
  type: 'cafe',
  cats: [
    {
      name: ['Coffee', 'Café'], share: 0.24, pop: 2.6, price: [1.5, 3.6], costRatio: 0.24, vat: 0.1, heat: -0.25,
      bases: [['Espresso', 'Café solo'], ['Coffee with milk', 'Café con leche'], ['Cortado', 'Cortado'], ['Americano', 'Americano'], ['Cappuccino', 'Capuchino'], ['Flat white', 'Flat white'], ['Latte', 'Latte'], ['Mocha', 'Moca'], ['Decaf', 'Descafeinado'], ['Bombón', 'Bombón']], variants: SIZES3,
    },
    {
      name: ['Tea & chocolate', 'Té y chocolate'], share: 0.1, pop: 0.8, price: [2, 3.8], costRatio: 0.24, vat: 0.1, heat: -0.4, season: [1.4, 1.3, 1.1, 0.9, 0.7, 0.5, 0.4, 0.4, 0.8, 1.1, 1.3, 1.5],
      bases: [['Black tea', 'Té negro'], ['Green tea', 'Té verde'], ['Hot chocolate', 'Chocolate a la taza'], ['Chai latte', 'Chai latte'], ['Chamomile', 'Manzanilla'], ['Rooibos', 'Rooibos'], ['Matcha latte', 'Matcha latte']], variants: SIZES3,
    },
    {
      name: ['Cold drinks', 'Bebidas frías'], share: 0.16, pop: 1, price: [2, 4.8], costRatio: 0.3, vat: 0.1, heat: 0.7, season: [0.5, 0.5, 0.7, 0.9, 1.2, 1.6, 1.9, 1.8, 1.2, 0.8, 0.5, 0.5],
      bases: [['Iced latte', 'Latte con hielo'], ['Orange juice', 'Zumo de naranja'], ['Cold brew', 'Cold brew'], ['Lemonade', 'Limonada'], ['Still water', 'Agua'], ['Iced tea', 'Té helado'], ['Smoothie', 'Batido de frutas'], ['Frappé', 'Frappé'], ['Sparkling water', 'Agua con gas'], ['Horchata', 'Horchata']], variants: SIZES3,
    },
    {
      name: ['Pastries', 'Bollería'], share: 0.2, pop: 1.5, price: [1.4, 3.6], costRatio: 0.39, vat: 0.1, spoil: 0.14,
      bases: [['Croissant', 'Cruasán'], ['Napolitana', 'Napolitana de chocolate'], ['Muffin', 'Magdalena'], ['Ensaimada', 'Ensaimada'], ['Cinnamon roll', 'Rollo de canela'], ['Butter cookie', 'Galleta de mantequilla'], ['Palmier', 'Palmera'], ['Almond croissant', 'Cruasán de almendra'], ['Scone', 'Scone'], ['Churros', 'Churros'], ['Donut', 'Rosquilla glaseada'], ['Banana bread', 'Bizcocho de plátano']],
    },
    {
      name: ['Breakfast & toast', 'Desayunos y tostadas'], share: 0.12, pop: 1.2, price: [2.4, 7.5], costRatio: 0.37, vat: 0.1, spoil: 0.1,
      bases: [['Tomato toast', 'Tostada con tomate'], ['Butter and jam toast', 'Tostada con mantequilla y mermelada'], ['Ham toast', 'Tostada con jamón'], ['Avocado toast', 'Tostada de aguacate'], ['Yoghurt and granola', 'Yogur con granola'], ['Scrambled eggs', 'Huevos revueltos'], ['Porridge', 'Porridge'], ['Fruit bowl', 'Bol de fruta']],
    },
    {
      name: ['Sandwiches', 'Bocadillos y sándwiches'], share: 0.1, pop: 0.9, price: [3.8, 8.5], costRatio: 0.41, vat: 0.1, spoil: 0.17,
      bases: [['Ham and cheese toastie', 'Sándwich mixto'], ['Tortilla sandwich', 'Pincho de tortilla'], ['Chicken wrap', 'Wrap de pollo'], ['Veggie sandwich', 'Sándwich vegetal'], ['Tuna baguette', 'Bocadillo de atún'], ['Serrano ham baguette', 'Bocadillo de jamón'], ['Bagel with salmon', 'Bagel de salmón'], ['Caprese panini', 'Panini caprese']],
    },
    {
      name: ['Cakes', 'Tartas'], share: 0.08, pop: 0.7, price: [3.5, 5.5], costRatio: 0.37, vat: 0.1, spoil: 0.13,
      bases: [['Carrot cake', 'Tarta de zanahoria'], ['Cheesecake', 'Tarta de queso'], ['Brownie', 'Brownie'], ['Lemon pie', 'Tarta de limón'], ['Red velvet', 'Red velvet'], ['Apple pie', 'Tarta de manzana']],
    },
  ],
  baseTraffic: 380, size: [25, 250, 70], conv: 0.86, basket: 1.75, multiQty: 0.08, elasticity: 0.9,
  dow: [1, 1, 1.02, 1.05, 1.15, 1.2, 0.95], month: [0.95, 0.95, 1, 1.05, 1.05, 1.05, 0.95, 0.75, 1.05, 1.08, 1.02, 1.05],
  events: { christmas_season: 1.08 }, holiday: 0.75, rain: -0.12, heat: 0.02,
  hours: curve([[6, 0], [7, 5], [8, 12], [9, 13], [10, 9], [11, 7], [13, 5], [14, 4], [16, 6], [17, 8], [18, 6], [20, 2], [21, 0]]),
  hoursWe: curve([[7, 0], [8, 3], [9, 8], [10, 12], [11, 13], [12, 10], [14, 5], [17, 8], [18, 7], [20, 2], [21, 0]]),
  identified: 0.4, custK: 800, churn: 0.07,
  segments: [[['Commuter', 'De camino al trabajo'], 0.34], [['Student', 'Estudiante'], 0.2], [['Remote worker', 'Teletrabajador'], 0.16], [['Neighbour', 'Vecino'], 0.2], [['Tourist', 'Turista'], 0.1]],
  returnRate: 0.003, returnOnline: 0.01, restock: 0, onlineShare: 0.08, txPerStaffHour: 20,
  roles: [[['Barista', 'Barista'], 10.1], [['Shift lead', 'Responsable de turno'], 12.6]],
  items: [14, 79, 40], leadTime: [1, 3], reorderDefault: 2,
  suppliers: [['Tostadores del Puerto', 'Tostadores del Puerto'], ['Obrador San Roque', 'Obrador San Roque'], ['Lácteos Valle Verde', 'Lácteos Valle Verde'], ['Fruta del Día', 'Fruta del Día']],
  rentM2: [24, 55, 110], fitoutM2: 900, utilitiesM2: 12, overheadM2: 10, overheadPct: 0.1, minStock: 3, marketingScale: 700, hoursDefault: [7, 20], closedDefault: -1,
  menuPrices: true, catalogue: genericCatalogue,
};

const PACK: [string, string, number][] = [['', '', 1], ['(large pack)', '(envase grande)', 1.6], ['(travel size)', '(tamaño viaje)', 0.6], ['(duo pack)', '(pack dúo)', 1.8]];
const winterIll = [1.7, 1.6, 1.3, 0.9, 0.7, 0.6, 0.55, 0.55, 0.8, 1.1, 1.4, 1.7];
const allergy = [0.5, 0.7, 1.3, 1.9, 2, 1.5, 0.9, 0.7, 0.8, 0.7, 0.5, 0.5];
const sun = [0.2, 0.3, 0.5, 0.9, 1.6, 2.5, 3, 2.6, 1.1, 0.4, 0.2, 0.2];

export const pharmacy: Template = {
  type: 'pharmacy',
  cats: [
    {
      name: ['Prescription medicines', 'Medicamentos con receta'], share: 0.24, pop: 2, price: [2.5, 28], costRatio: 0.84, vat: 0.04,
      bases: [['Omeprazole 20 mg', 'Omeprazol 20 mg'], ['Atorvastatin 20 mg', 'Atorvastatina 20 mg'], ['Enalapril 10 mg', 'Enalapril 10 mg'], ['Metformin 850 mg', 'Metformina 850 mg'], ['Amoxicillin 500 mg', 'Amoxicilina 500 mg'], ['Levothyroxine 50 mcg', 'Levotiroxina 50 mcg'], ['Simvastatin 20 mg', 'Simvastatina 20 mg'], ['Losartan 50 mg', 'Losartán 50 mg'], ['Salbutamol inhaler', 'Salbutamol inhalador'], ['Amlodipine 5 mg', 'Amlodipino 5 mg'], ['Sertraline 50 mg', 'Sertralina 50 mg'], ['Lorazepam 1 mg', 'Lorazepam 1 mg'], ['Azithromycin 500 mg', 'Azitromicina 500 mg'], ['Bisoprolol 5 mg', 'Bisoprolol 5 mg'], ['Tramadol 50 mg', 'Tramadol 50 mg'], ['Insulin glargine pen', 'Insulina glargina pluma']],
      variants: [['28 tabs', '28 comp.', 1], ['56 tabs', '56 comp.', 1.7], ['generic', 'genérico', 0.75], ['14 tabs', '14 comp.', 0.6]],
    },
    {
      name: ['Pain & fever', 'Dolor y fiebre'], share: 0.1, pop: 2.2, price: [1.9, 9.5], costRatio: 0.72, vat: 0.04,
      bases: [['Paracetamol 1 g', 'Paracetamol 1 g'], ['Ibuprofen 400 mg', 'Ibuprofeno 400 mg'], ['Ibuprofen 600 mg', 'Ibuprofeno 600 mg'], ['Aspirin 500 mg', 'Ácido acetilsalicílico 500 mg'], ['Paracetamol syrup for children', 'Paracetamol jarabe infantil'], ['Anti-inflammatory gel', 'Gel antiinflamatorio'], ['Heat patch', 'Parche de calor']], variants: PACK,
    },
    {
      name: ['Cold & flu', 'Gripe y resfriado'], share: 0.1, pop: 1.4, price: [3.5, 12], costRatio: 0.67, vat: 0.1, season: winterIll, heat: -0.3,
      bases: [['Cold relief sachets', 'Sobres antigripales'], ['Cough syrup', 'Jarabe para la tos'], ['Throat lozenges', 'Pastillas para la garganta'], ['Nasal spray', 'Spray nasal'], ['Sea water spray', 'Agua de mar en spray'], ['Vapour rub', 'Ungüento balsámico'], ['Thermometer', 'Termómetro'], ['Propolis spray', 'Spray de propóleo']], variants: PACK,
    },
    {
      name: ['Allergy', 'Alergia'], share: 0.05, pop: 1, price: [4, 13], costRatio: 0.7, vat: 0.04, season: allergy,
      bases: [['Cetirizine 10 mg', 'Cetirizina 10 mg'], ['Loratadine 10 mg', 'Loratadina 10 mg'], ['Antihistamine eye drops', 'Colirio antihistamínico'], ['Allergy nasal spray', 'Spray nasal antialérgico'], ['Ebastine 20 mg', 'Ebastina 20 mg']], variants: PACK,
    },
    {
      name: ['Skin care', 'Dermocosmética'], share: 0.16, pop: 0.8, price: [8, 42], costRatio: 0.64, vat: 0.21, events: { christmas_season: 1.5, mothers_day: 1.5, black_friday: 1.6 },
      bases: [['Moisturising cream', 'Crema hidratante'], ['Cleansing gel', 'Gel limpiador'], ['Micellar water', 'Agua micelar'], ['Anti-ageing serum', 'Sérum antiedad'], ['Hand cream', 'Crema de manos'], ['Lip balm', 'Bálsamo labial'], ['Eye contour', 'Contorno de ojos'], ['Body lotion', 'Loción corporal'], ['Anti-blemish gel', 'Gel antiimperfecciones'], ['Thermal water spray', 'Agua termal en spray'], ['Night cream', 'Crema de noche'], ['Vitamin C serum', 'Sérum de vitamina C']], variants: PACK,
    },
    {
      name: ['Sun care', 'Protección solar'], share: 0.06, pop: 0.9, price: [9, 27], costRatio: 0.6, vat: 0.21, season: sun, heat: 0.6,
      bases: [['Sunscreen SPF 50', 'Protector solar SPF 50'], ['Sunscreen SPF 30', 'Protector solar SPF 30'], ['Kids sunscreen SPF 50+', 'Protector infantil SPF 50+'], ['After-sun lotion', 'Loción aftersun'], ['Face sunscreen SPF 50', 'Protector facial SPF 50'], ['Sun stick', 'Stick solar']], variants: PACK,
    },
    {
      name: ['Vitamins & supplements', 'Vitaminas y complementos'], share: 0.1, pop: 0.8, price: [7, 32], costRatio: 0.58, vat: 0.1, season: [1.5, 1.1, 1, 1, 0.9, 0.9, 0.8, 0.8, 1.3, 1.1, 1, 1],
      bases: [['Vitamin D', 'Vitamina D'], ['Multivitamin', 'Multivitamínico'], ['Magnesium', 'Magnesio'], ['Omega 3', 'Omega 3'], ['Vitamin C', 'Vitamina C'], ['Probiotics', 'Probióticos'], ['Collagen', 'Colágeno'], ['Iron', 'Hierro'], ['Melatonin', 'Melatonina'], ['Royal jelly', 'Jalea real']], variants: PACK,
    },
    {
      name: ['Baby', 'Bebé'], share: 0.07, pop: 0.8, price: [3, 26], costRatio: 0.7, vat: 0.1,
      bases: [['Nappy cream', 'Crema para el pañal'], ['Formula milk 1', 'Leche de inicio 1'], ['Formula milk 2', 'Leche de continuación 2'], ['Baby wipes', 'Toallitas'], ['Dummy', 'Chupete'], ['Baby bath gel', 'Gel de baño infantil'], ['Feeding bottle', 'Biberón'], ['Saline solution', 'Suero fisiológico']], variants: PACK,
    },
    {
      name: ['Hygiene & first aid', 'Higiene y botiquín'], share: 0.12, pop: 1.2, price: [1.5, 16], costRatio: 0.64, vat: 0.21,
      bases: [['Plasters', 'Tiritas'], ['Toothpaste', 'Pasta de dientes'], ['Hand sanitiser', 'Gel hidroalcohólico'], ['Mouthwash', 'Colutorio'], ['Sterile gauze', 'Gasas estériles'], ['Antiseptic', 'Antiséptico'], ['Toothbrush', 'Cepillo de dientes'], ['Insect repellent', 'Repelente de insectos'], ['Dental floss', 'Hilo dental'], ['Elastic bandage', 'Venda elástica'], ['Shampoo', 'Champú'], ['Deodorant', 'Desodorante']], variants: PACK,
    },
  ],
  baseTraffic: 300, size: [40, 250, 90], conv: 0.82, basket: 2, multiQty: 0.12, elasticity: 0.45,
  dow: [1.15, 1.05, 1.02, 1, 1.05, 0.75, 0.3], month: [1.15, 1.1, 1.05, 1.02, 1, 0.98, 0.95, 0.8, 0.98, 1.02, 1.05, 1.12],
  events: { black_friday: 1.08 }, holiday: 0.3, rain: -0.05, heat: 0,
  hours: curve([[8, 0], [9, 6], [11, 10], [13, 8], [14, 4], [16, 4], [17, 8], [19, 10], [20, 6], [21, 1], [22, 0]]),
  hoursWe: curve([[8, 0], [9, 5], [11, 10], [13, 9], [14, 3], [17, 3], [19, 4], [21, 1], [22, 0]]),
  identified: 0.5, custK: 900, churn: 0.05,
  segments: [[['Chronic patient', 'Paciente crónico'], 0.3], [['Family', 'Familia'], 0.28], [['Senior', 'Sénior'], 0.22], [['Occasional', 'Ocasional'], 0.2]],
  returnRate: 0.003, returnOnline: 0.02, restock: 0.3, onlineShare: 0.06, txPerStaffHour: 9.5,
  roles: [[['Pharmacy technician', 'Técnico de farmacia'], 11.4], [['Pharmacist', 'Farmacéutico'], 18.5]],
  items: [80, 330, 220], leadTime: [1, 2], reorderDefault: 18,
  suppliers: [['Cooperativa Farmacéutica Norte', 'Cooperativa Farmacéutica Norte'], ['Distribución Sanitaria Ibérica', 'Distribución Sanitaria Ibérica'], ['DermoLab Distribución', 'DermoLab Distribución']],
  rentM2: [22, 45, 95], fitoutM2: 800, utilitiesM2: 2.6, overheadM2: 3, overheadPct: 0.02, minStock: 6, marketingScale: 600, hoursDefault: [9, 21], closedDefault: 6,
  catalogue: genericCatalogue,
};

const BRAND: [string, string, number][] = [['Almar', 'Almar', 0.8], ['', '', 1], ['Selecta', 'Selecta', 1.3], ['Eco', 'Eco', 1.5], ['family pack', 'formato familiar', 1.7], ['Almar mini', 'Almar mini', 0.55]];
const b = (...names: L[]) => names;

export const supermarket: Template = {
  type: 'supermarket',
  cats: [
    { name: ['Fruit & vegetables', 'Fruta y verdura'], share: 0.14, pop: 1.8, price: [0.9, 4.5], costRatio: 0.73, vat: 0.04, spoil: 0.03, bases: b(['Bananas 1 kg', 'Plátanos 1 kg'], ['Tomatoes 1 kg', 'Tomates 1 kg'], ['Potatoes 2 kg', 'Patatas 2 kg'], ['Onions 1 kg', 'Cebollas 1 kg'], ['Apples 1 kg', 'Manzanas 1 kg'], ['Oranges 2 kg', 'Naranjas 2 kg'], ['Lettuce', 'Lechuga'], ['Carrots 1 kg', 'Zanahorias 1 kg'], ['Peppers 500 g', 'Pimientos 500 g'], ['Courgettes 1 kg', 'Calabacines 1 kg'], ['Lemons 1 kg', 'Limones 1 kg'], ['Strawberries 500 g', 'Fresas 500 g'], ['Avocados 2 units', 'Aguacates 2 uds.'], ['Mushrooms 250 g', 'Champiñones 250 g']), variants: BRAND },
    { name: ['Bakery', 'Panadería'], share: 0.07, pop: 1.9, price: [0.6, 3.5], costRatio: 0.54, vat: 0.04, spoil: 0.099, bases: b(['Baguette', 'Barra de pan'], ['Sliced bread', 'Pan de molde'], ['Wholemeal loaf', 'Pan integral'], ['Croissants 4 units', 'Cruasanes 4 uds.'], ['Muffins 6 units', 'Magdalenas 6 uds.'], ['Rustic loaf', 'Hogaza rústica'], ['Burger buns', 'Pan de hamburguesa']), variants: BRAND },
    { name: ['Dairy & eggs', 'Lácteos y huevos'], share: 0.12, pop: 1.7, price: [0.8, 5.5], costRatio: 0.78, vat: 0.04, spoil: 0.01, bases: b(['Milk 1 L', 'Leche 1 L'], ['Eggs 12 units', 'Huevos 12 uds.'], ['Natural yoghurt 4 units', 'Yogur natural 4 uds.'], ['Butter 250 g', 'Mantequilla 250 g'], ['Sliced cheese 200 g', 'Queso en lonchas 200 g'], ['Fresh cheese 250 g', 'Queso fresco 250 g'], ['Cream 200 ml', 'Nata 200 ml'], ['Oat drink 1 L', 'Bebida de avena 1 L'], ['Grated cheese 150 g', 'Queso rallado 150 g'], ['Kefir 500 ml', 'Kéfir 500 ml']), variants: BRAND },
    { name: ['Meat & fish', 'Carne y pescado'], share: 0.1, pop: 1.2, price: [2.8, 14], costRatio: 0.8, vat: 0.1, spoil: 0.023, bases: b(['Chicken breast 500 g', 'Pechuga de pollo 500 g'], ['Minced beef 400 g', 'Carne picada 400 g'], ['Pork loin 500 g', 'Lomo de cerdo 500 g'], ['Salmon fillets 250 g', 'Lomos de salmón 250 g'], ['Hake fillets 400 g', 'Filetes de merluza 400 g'], ['Cooked ham 150 g', 'Jamón cocido 150 g'], ['Serrano ham 100 g', 'Jamón serrano 100 g'], ['Chicken thighs 600 g', 'Muslos de pollo 600 g'], ['Prawns 300 g', 'Langostinos 300 g'], ['Chorizo 200 g', 'Chorizo 200 g']), variants: BRAND },
    { name: ['Pantry', 'Despensa'], share: 0.18, pop: 1.2, price: [0.7, 8.5], costRatio: 0.76, vat: 0.1, bases: b(['Olive oil 1 L', 'Aceite de oliva 1 L'], ['Rice 1 kg', 'Arroz 1 kg'], ['Spaghetti 500 g', 'Espaguetis 500 g'], ['Tinned tuna 3 units', 'Atún en lata 3 uds.'], ['Chickpeas jar', 'Garbanzos en bote'], ['Tomato sauce', 'Tomate frito'], ['Sugar 1 kg', 'Azúcar 1 kg'], ['Flour 1 kg', 'Harina 1 kg'], ['Ground coffee 250 g', 'Café molido 250 g'], ['Breakfast cereal', 'Cereales de desayuno'], ['Lentils 1 kg', 'Lentejas 1 kg'], ['Biscuits', 'Galletas'], ['Salt 1 kg', 'Sal 1 kg'], ['Sunflower oil 1 L', 'Aceite de girasol 1 L'], ['Cocoa powder', 'Cacao en polvo'], ['Jam', 'Mermelada']), variants: BRAND },
    { name: ['Drinks', 'Bebidas'], share: 0.11, pop: 1.3, price: [0.5, 9], costRatio: 0.73, vat: 0.21, heat: 0.35, season: [0.85, 0.85, 0.9, 1, 1.1, 1.25, 1.35, 1.3, 1.05, 0.9, 0.85, 1.2], bases: b(['Water 1.5 L', 'Agua 1,5 L'], ['Cola 2 L', 'Refresco de cola 2 L'], ['Beer 6-pack', 'Cerveza pack 6'], ['Orange juice 1 L', 'Zumo de naranja 1 L'], ['Red wine', 'Vino tinto'], ['Sparkling water 1 L', 'Agua con gas 1 L'], ['Lemon soda 2 L', 'Refresco de limón 2 L'], ['White wine', 'Vino blanco'], ['Isotonic drink', 'Bebida isotónica'], ['Tonic 4-pack', 'Tónica pack 4']), variants: BRAND },
    { name: ['Frozen', 'Congelados'], share: 0.07, pop: 0.9, price: [1.5, 8], costRatio: 0.73, vat: 0.1, bases: b(['Frozen peas 1 kg', 'Guisantes congelados 1 kg'], ['Pizza margherita', 'Pizza margarita'], ['Ice cream tub', 'Tarrina de helado'], ['Fish fingers', 'Varitas de pescado'], ['Frozen spinach', 'Espinacas congeladas'], ['Croquettes', 'Croquetas'], ['Chips 1 kg', 'Patatas prefritas 1 kg'], ['Ice lollies 6 units', 'Polos 6 uds.']), variants: BRAND },
    { name: ['Snacks & sweets', 'Aperitivos y dulces'], share: 0.08, pop: 1, price: [0.8, 5], costRatio: 0.67, vat: 0.1, events: { christmas_season: 1.5 }, bases: b(['Crisps', 'Patatas fritas'], ['Chocolate bar', 'Tableta de chocolate'], ['Olives', 'Aceitunas'], ['Mixed nuts', 'Frutos secos'], ['Chewing gum', 'Chicles'], ['Popcorn', 'Palomitas'], ['Turrón', 'Turrón'], ['Gummies', 'Gominolas']), variants: BRAND },
    { name: ['Household', 'Hogar y limpieza'], share: 0.08, pop: 0.8, price: [1, 12], costRatio: 0.71, vat: 0.21, bases: b(['Toilet paper 12 rolls', 'Papel higiénico 12 rollos'], ['Laundry detergent', 'Detergente'], ['Dishwasher tablets', 'Pastillas de lavavajillas'], ['Kitchen roll', 'Papel de cocina'], ['Bleach 2 L', 'Lejía 2 L'], ['Bin bags', 'Bolsas de basura'], ['Washing-up liquid', 'Lavavajillas a mano'], ['Fabric softener', 'Suavizante']), variants: BRAND },
    { name: ['Personal care & pets', 'Cuidado personal y mascotas'], share: 0.05, pop: 0.7, price: [1.2, 11], costRatio: 0.69, vat: 0.21, bases: b(['Shower gel', 'Gel de ducha'], ['Shampoo', 'Champú'], ['Toothpaste', 'Pasta de dientes'], ['Dog food 3 kg', 'Pienso para perro 3 kg'], ['Cat food 1.5 kg', 'Pienso para gato 1,5 kg'], ['Deodorant', 'Desodorante'], ['Cat litter', 'Arena para gatos']), variants: BRAND },
  ],
  baseTraffic: 300, size: [120, 800, 300], conv: 0.93, basket: 7.5, multiQty: 0.2, elasticity: 1.9,
  dow: [0.95, 0.9, 0.92, 0.98, 1.2, 1.45, 0.6], month: [0.98, 0.95, 1, 1, 1, 1, 0.95, 0.85, 1, 1, 1.02, 1.25],
  events: { christmas_season: 1.12 }, holiday: 0, rain: -0.06, heat: 0,
  hours: curve([[8, 0], [9, 5], [11, 9], [13, 8], [14, 5], [16, 5], [18, 10], [20, 9], [21, 3], [22, 0]]),
  hoursWe: curve([[8, 0], [9, 5], [11, 10], [13, 10], [15, 5], [18, 8], [20, 6], [21, 2], [22, 0]]),
  identified: 0.6, custK: 800, churn: 0.04,
  segments: [[['Family', 'Familia'], 0.36], [['Single household', 'Hogar unipersonal'], 0.24], [['Senior', 'Sénior'], 0.2], [['Student flat', 'Piso de estudiantes'], 0.12], [['Passer-by', 'De paso'], 0.08]],
  returnRate: 0.004, returnOnline: 0.015, restock: 0.2, onlineShare: 0.07, txPerStaffHour: 10,
  roles: [[['Cashier', 'Cajero'], 9.9], [['Shelf stocker', 'Reponedor'], 9.7], [['Store manager', 'Encargado'], 15.8], [['Butcher & fishmonger', 'Carnicero y pescadero'], 11.8]],
  items: [200, 588, 400], leadTime: [1, 4], reorderDefault: 8,
  suppliers: [['Mercahuerta', 'Mercahuerta'], ['Central Láctea del Norte', 'Central Láctea del Norte'], ['Cárnicas Sierra', 'Cárnicas Sierra'], ['Almar Distribución', 'Almar Distribución'], ['Bebidas del Sur', 'Bebidas del Sur'], ['Hogar Limpio Mayorista', 'Hogar Limpio Mayorista']],
  rentM2: [13, 26, 55], fitoutM2: 600, utilitiesM2: 4.5, overheadM2: 4, overheadPct: 0.02, minStock: 6, marketingScale: 1500, hoursDefault: [9, 21], closedDefault: 6,
  catalogue: genericCatalogue,
};
