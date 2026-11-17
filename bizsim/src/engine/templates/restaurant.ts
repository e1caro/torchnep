import { curve, genericCatalogue, type Template } from './common';

const terrace = [0.85, 0.85, 0.95, 1, 1.05, 1.15, 1.2, 1.15, 1.05, 1, 0.9, 0.95];

export const restaurant: Template = {
  type: 'restaurant',
  cats: [
    {
      name: ['Starters', 'Entrantes'], share: 0.22, pop: 0.9, price: [5.5, 15], costRatio: 0.33, vat: 0.1, spoil: 0.03,
      bases: [['Patatas bravas', 'Patatas bravas'], ['Ham croquettes', 'Croquetas de jamón'], ['Russian salad', 'Ensaladilla rusa'], ['Garlic prawns', 'Gambas al ajillo'], ['Tomato salad', 'Ensalada de tomate'], ['Padrón peppers', 'Pimientos de Padrón'], ['Grilled octopus', 'Pulpo a la brasa'], ['Iberian ham board', 'Tabla de jamón ibérico'], ['Cheese board', 'Tabla de quesos'], ['Gazpacho', 'Gazpacho'], ['Fried calamari', 'Calamares fritos'], ['Burrata salad', 'Ensalada de burrata'], ['Steamed mussels', 'Mejillones al vapor'], ['Hummus with crudités', 'Hummus con crudités'], ['Tuna tartare', 'Tartar de atún'], ['Leek soup', 'Crema de puerros']],
    },
    {
      name: ['Mains', 'Principales'], share: 0.3, pop: 1.25, price: [11, 26], costRatio: 0.37, vat: 0.1, spoil: 0.035,
      bases: [['Chicken paella', 'Paella de pollo'], ['Seafood paella', 'Paella de marisco'], ['Grilled hake', 'Merluza a la plancha'], ['Beef burger', 'Hamburguesa de ternera'], ['Vegetable lasagne', 'Lasaña de verduras'], ['Roast chicken', 'Pollo asado'], ['Mushroom risotto', 'Risotto de setas'], ['Pork cheeks', 'Carrilleras de cerdo'], ['Grilled sea bass', 'Lubina a la brasa'], ['Sirloin steak', 'Solomillo'], ['Black rice', 'Arroz negro'], ['Cod pil-pil', 'Bacalao al pil-pil'], ['Lamb shoulder', 'Paletilla de cordero'], ['Vegetable curry', 'Curry de verduras'], ['Entrecôte', 'Entrecot'], ['Tuna steak', 'Lomo de atún'], ['Oxtail stew', 'Rabo de toro'], ['Duck confit', 'Confit de pato'], ['Spinach cannelloni', 'Canelones de espinacas'], ['T-bone steak', 'Chuletón'], ['Grilled salmon', 'Salmón a la plancha'], ['Fideuà', 'Fideuà']],
    },
    {
      name: ['Desserts', 'Postres'], share: 0.14, pop: 0.55, price: [4.5, 8.5], costRatio: 0.26, vat: 0.1, spoil: 0.035,
      bases: [['Crème caramel', 'Flan casero'], ['Cheesecake', 'Tarta de queso'], ['Chocolate coulant', 'Coulant de chocolate'], ['Fruit salad', 'Macedonia de fruta'], ['Catalan cream', 'Crema catalana'], ['Ice cream scoop', 'Bola de helado'], ['Tiramisu', 'Tiramisú'], ['Rice pudding', 'Arroz con leche'], ['Lemon sorbet', 'Sorbete de limón'], ['Brownie with ice cream', 'Brownie con helado'], ['Torrija', 'Torrija']],
    },
    {
      name: ['Soft drinks & coffee', 'Refrescos y café'], share: 0.16, pop: 1.5, price: [1.8, 4], costRatio: 0.20, vat: 0.1, heat: 0.12,
      bases: [['Still water', 'Agua mineral'], ['Espresso', 'Café solo'], ['Cola', 'Refresco de cola'], ['Coffee with milk', 'Café con leche'], ['Sparkling water', 'Agua con gas'], ['Orange soda', 'Refresco de naranja'], ['Orange juice', 'Zumo de naranja'], ['Lemonade', 'Limonada'], ['Herbal tea', 'Infusión'], ['Iced tea', 'Té frío'], ['Tonic water', 'Tónica'], ['Alcohol-free beer', 'Cerveza sin alcohol']],
    },
    {
      name: ['Beer & wine', 'Cerveza y vino'], share: 0.18, pop: 1.1, price: [2.8, 26], costRatio: 0.33, vat: 0.1,
      bases: [['Draught beer', 'Caña'], ['Glass of red wine', 'Copa de tinto'], ['Glass of white wine', 'Copa de blanco'], ['Bottled beer', 'Tercio'], ['Vermouth', 'Vermut'], ['Sangria jug', 'Jarra de sangría'], ['Craft beer', 'Cerveza artesana'], ['Glass of cava', 'Copa de cava'], ['Gin and tonic', 'Gin-tonic'], ['Bottle of Rioja', 'Botella de Rioja'], ['Bottle of Verdejo', 'Botella de Verdejo'], ['Bottle of Ribera', 'Botella de Ribera'], ['Bottle of Albariño', 'Botella de Albariño'], ['Bottle of cava', 'Botella de cava']],
    },
  ],
  baseTraffic: 62, size: [50, 400, 140], conv: 0.92, basket: 6.4, multiQty: 0.22, elasticity: 1.2,
  dow: [0.6, 0.72, 0.8, 0.95, 1.35, 1.6, 1.3], month: terrace,
  events: { valentines: 1.7, mothers_day: 1.6, christmas_season: 1.2, black_friday: 1.05 },
  holiday: 1.35, rain: -0.1, heat: 0.03,
  hours: curve([[12, 0], [13, 5], [14, 10], [15, 7], [16, 1], [19, 1], [20, 5], [21, 10], [22, 7], [23, 2], [24, 0]]),
  hoursWe: curve([[12, 0], [13, 5], [14, 10], [15, 9], [16, 3], [19, 2], [20, 6], [21, 10], [22, 9], [23, 3], [24, 0]]),
  identified: 0.34, custK: 450, churn: 0.24,
  segments: [[['Couple', 'Pareja'], 0.3], [['Family', 'Familia'], 0.22], [['Friends', 'Amigos'], 0.22], [['Business lunch', 'Comida de trabajo'], 0.14], [['Tourist', 'Turista'], 0.12]],
  returnRate: 0.004, returnOnline: 0.012, restock: 0, onlineShare: 0.14, txPerStaffHour: 1.75,
  roles: [[['Waiter', 'Camarero'], 10.6], [['Cook', 'Cocinero'], 12.4], [['Head chef', 'Jefe de cocina'], 17.5], [['Kitchen porter', 'Ayudante de cocina'], 9.6]],
  items: [16, 75, 42], leadTime: [1, 3], reorderDefault: 2,
  suppliers: [['Mercado Central Fresh', 'Mercado Central Fresh'], ['Pescados Cantábrico', 'Pescados Cantábrico'], ['Carnes La Dehesa', 'Carnes La Dehesa'], ['Bodegas Unidas', 'Bodegas Unidas'], ['Distribuciones Horeca Sur', 'Distribuciones Horeca Sur']],
  rentM2: [16, 34, 75], fitoutM2: 1100, utilitiesM2: 9, overheadM2: 9, overheadPct: 0.07, minStock: 3, marketingScale: 1200, hoursDefault: [13, 24], closedDefault: 0,
  menuPrices: true, party: 2.6, catalogue: genericCatalogue,
};
