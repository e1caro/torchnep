// The single source of truth for the generated tables: names, column types, keys and descriptions.
// It drives the engine's storage, the SQLite schema, the data dictionary, the table view and the key tests.

import type { ColDef, ColType, TableDef } from './table';
import type { BizType } from './types';

type Opt = Partial<Pick<ColDef, 'ref' | 'values' | 'nullable' | 'measure'>>;
const c = (name: string, type: ColType, en: string, es: string, o: Opt = {}): ColDef => ({ name, type, d: [en, es], ...o });
const pk = (name: string, en: string, es: string) => c(name, 'id', en, es);
const fk = (name: string, ref: string, en: string, es: string, nullable = false) => c(name, 'fk', en, es, { ref, nullable });
const day = (name: string, en: string, es: string, o: Opt = {}) => c(name, 'date', en, es, { ref: 'calendar', ...o });
const m = (name: string, en: string, es: string) => c(name, 'money', en, es, { measure: true });
const n = (name: string, en: string, es: string) => c(name, 'int', en, es, { measure: true });

export const E = {
  weekday: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  channel: ['store', 'online'],
  payment: ['card', 'cash', 'mobile', 'paypal'],
  movement: ['purchase', 'sale', 'return', 'waste'],
  expense: ['rent', 'payroll', 'utilities', 'marketing', 'card_fees', 'other'],
  poStatus: ['pending', 'received'],
  reason: ['wrong_size', 'changed_mind', 'defective', 'not_as_described', 'late_delivery', 'complaint'],
  age: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
  gender: ['F', 'M', 'X'],
  zone: ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'],
  acq: ['walk_in', 'referral', 'social', 'search', 'flyers', 'email', 'online_organic'],
  mkt: ['social', 'search', 'flyers', 'email'],
  shift: ['morning', 'afternoon', 'full_day'],
  zoneTable: ['indoor', 'terrace', 'bar'],
  resStatus: ['completed', 'no_show', 'cancelled'],
  format: ['paperback', 'hardcover', 'pocket'],
  anomaly: ['viral_day', 'supplier_delay', 'till_outage', 'roadworks', 'extreme_weather'],
} as const;

export function schemaFor(type: BizType): TableDef[] {
  const productExtra: ColDef[] =
    type === 'clothing' ? [
      c('style', 'text', 'Garment model shared by its size and colour variants', 'Modelo de prenda que comparten sus variantes de talla y color'),
      c('size', 'text', 'Size of this variant', 'Talla de esta variante'),
      c('colour', 'text', 'Colour of this variant', 'Color de esta variante'),
    ] : type === 'bookshop' ? [
      fk('author_id', 'authors', 'Author of the book', 'Autor del libro'),
      fk('publisher_id', 'publishers', 'Publisher of the book', 'Editorial del libro'),
      c('format', 'enum', 'Binding', 'Encuadernación', { values: E.format }),
      c('pub_year', 'int', 'Year of publication', 'Año de publicación'),
    ] : [];
  const txExtra: ColDef[] = type === 'restaurant' ? [
    fk('table_id', 'tables', 'Table where the party sat; empty for delivery orders', 'Mesa del grupo; vacío en pedidos a domicilio', true),
    c('party_size', 'int', 'Guests in the party; empty for delivery orders', 'Comensales del grupo; vacío en pedidos a domicilio', { measure: true, nullable: true }),
  ] : [];

  const t: TableDef[] = [
    {
      name: 'calendar', d: ['Date dimension: one row per day, with holidays and weather', 'Dimensión de fechas: una fila por día, con festivos y tiempo'],
      cols: [
        c('date', 'date', 'Day (primary key)', 'Día (clave primaria)'),
        c('year', 'int', 'Year', 'Año'), c('quarter', 'int', 'Quarter 1-4', 'Trimestre 1-4'), c('month', 'int', 'Month 1-12', 'Mes 1-12'),
        c('iso_week', 'int', 'ISO week number', 'Número de semana ISO'),
        c('weekday', 'int', 'Day of the week, 1 = Monday', 'Día de la semana, 1 = lunes'),
        c('weekday_name', 'enum', 'Name of the day of the week', 'Nombre del día de la semana', { values: E.weekday }),
        c('is_weekend', 'bool', '1 on Saturday and Sunday', '1 en sábado y domingo'),
        c('is_holiday', 'bool', '1 on a public holiday', '1 en festivo'),
        c('holiday_name', 'text', 'Name of the holiday', 'Nombre del festivo', { nullable: true }),
        c('event', 'text', 'Commercial event that day (sales season, Black Friday…)', 'Evento comercial del día (rebajas, Black Friday…)', { nullable: true }),
        c('temp_c', 'real', 'Mean temperature in °C', 'Temperatura media en °C'),
        c('rain_mm', 'real', 'Rainfall in mm', 'Lluvia en mm'),
        c('is_open', 'bool', '1 if the business opened', '1 si el negocio abrió'),
      ],
    },
    {
      name: 'categories', d: ['Product categories', 'Categorías de producto'],
      cols: [
        pk('category_id', 'Category key', 'Clave de la categoría'), c('name', 'text', 'Category name', 'Nombre de la categoría'),
        c('vat_rate', 'real', 'VAT rate included in prices (0.10 = 10 %)', 'IVA incluido en los precios (0,10 = 10 %)'),
        c('perishable', 'bool', '1 if stock spoils', '1 si el stock caduca'),
      ],
    },
    {
      name: 'suppliers', d: ['Suppliers of the products', 'Proveedores de los productos'],
      cols: [
        pk('supplier_id', 'Supplier key', 'Clave del proveedor'), c('name', 'text', 'Supplier name', 'Nombre del proveedor'),
        c('lead_time_days', 'int', 'Usual days between order and delivery', 'Días habituales entre pedido y entrega'),
        c('on_time_rate', 'real', 'Share of orders that arrive on the expected date', 'Proporción de pedidos que llegan en la fecha prevista'),
      ],
    },
    ...(type === 'bookshop' ? [
      { name: 'authors', d: ['Book authors', 'Autores'] as [string, string], cols: [pk('author_id', 'Author key', 'Clave del autor'), c('name', 'text', 'Author name (invented)', 'Nombre del autor (inventado)'), c('country', 'text', 'Country', 'País')] },
      { name: 'publishers', d: ['Book publishers', 'Editoriales'] as [string, string], cols: [pk('publisher_id', 'Publisher key', 'Clave de la editorial'), c('name', 'text', 'Publisher name (invented)', 'Nombre de la editorial (inventado)')] },
    ] : []),
    {
      name: 'products', d: ['Catalogue. Prices and costs are the current ones; past prices are on each sale line', 'Catálogo. Precios y costes son los actuales; los pasados están en cada línea de venta'],
      cols: [
        pk('product_id', 'Product key', 'Clave del producto'), c('sku', 'text', 'Stock keeping unit code', 'Código de referencia'),
        c('name', 'text', 'Product name', 'Nombre del producto'),
        fk('category_id', 'categories', 'Category', 'Categoría'), fk('supplier_id', 'suppliers', 'Supplier', 'Proveedor'),
        c('unit_cost', 'money', 'Current purchase cost per unit, without VAT', 'Coste de compra actual por unidad, sin IVA'),
        c('list_price', 'money', 'Current selling price, VAT included', 'Precio de venta actual, IVA incluido'),
        day('launch_date', 'First day on sale', 'Primer día a la venta', { nullable: true }),
        day('discontinued_date', 'Day it left the catalogue', 'Día en que salió del catálogo', { nullable: true }),
        c('active', 'bool', '1 if on sale now', '1 si está a la venta ahora'),
        ...productExtra,
      ],
    },
    {
      name: 'marketing_campaigns', d: ['Marketing campaigns and what they brought', 'Campañas de marketing y lo que aportaron'],
      cols: [
        pk('campaign_id', 'Campaign key', 'Clave de la campaña'), c('name', 'text', 'Campaign name', 'Nombre de la campaña'),
        c('channel', 'enum', 'Advertising channel', 'Canal publicitario', { values: E.mkt }),
        day('start_date', 'First day', 'Primer día'), c('end_date', 'date', 'Last day', 'Último día'),
        m('spend', 'Money spent', 'Dinero gastado'),
        n('attributed_new_customers', 'New identified customers attributed to it', 'Clientes nuevos identificados atribuidos a ella'),
      ],
    },
    {
      name: 'customers', d: ['Identified customers (loyalty card, account or booking). Anonymous buyers are not here', 'Clientes identificados (tarjeta, cuenta o reserva). Los compradores anónimos no están'],
      cols: [
        pk('customer_id', 'Customer key', 'Clave del cliente'), day('first_seen', 'Day of the first purchase', 'Día de la primera compra'),
        c('segment', 'text', 'Customer type', 'Tipo de cliente'),
        c('age_band', 'enum', 'Age band', 'Franja de edad', { values: E.age }), c('gender', 'enum', 'Gender', 'Género', { values: E.gender }),
        c('postcode_zone', 'enum', 'Distance zone, Z1 nearest', 'Zona por distancia, Z1 la más cercana', { values: E.zone }),
        c('acquisition_channel', 'enum', 'How the customer arrived', 'Cómo llegó el cliente', { values: E.acq }),
        fk('campaign_id', 'marketing_campaigns', 'Campaign that brought the customer, if any', 'Campaña que trajo al cliente, si la hubo', true),
        c('loyalty_member', 'bool', '1 if in the loyalty programme', '1 si está en el programa de fidelidad'),
        c('email_opt_in', 'bool', '1 if accepts e-mails', '1 si acepta correos'),
      ],
    },
    {
      name: 'employees', d: ['Staff, past and present', 'Plantilla, pasada y presente'],
      cols: [
        pk('employee_id', 'Employee key', 'Clave del empleado'), c('name', 'text', 'Name (invented)', 'Nombre (inventado)'), c('role', 'text', 'Job', 'Puesto'),
        day('hire_date', 'First day', 'Primer día'), day('end_date', 'Last day, empty if still employed', 'Último día, vacío si sigue', { nullable: true }),
        c('hourly_wage', 'money', 'Gross wage per hour', 'Salario bruto por hora'),
      ],
    },
    {
      name: 'shifts', d: ['Shifts worked', 'Turnos trabajados'], day: { col: 'date' },
      cols: [
        pk('shift_id', 'Shift key', 'Clave del turno'), fk('employee_id', 'employees', 'Employee', 'Empleado'), day('date', 'Day', 'Día'),
        c('shift', 'enum', 'Part of the day', 'Parte del día', { values: E.shift }),
        c('hours', 'real', 'Hours worked', 'Horas trabajadas', { measure: true }),
        m('cost', 'Cost to the company: wage plus social security', 'Coste para la empresa: salario más seguridad social'),
      ],
    },
    ...(type === 'restaurant' ? [{
      name: 'tables', d: ['Tables of the dining room', 'Mesas del local'] as [string, string],
      cols: [pk('table_id', 'Table key', 'Clave de la mesa'), c('seats', 'int', 'Seats', 'Plazas'), c('zone', 'enum', 'Area', 'Zona', { values: E.zoneTable })],
    }] : []),
    {
      name: 'transactions', d: ['One row per ticket or order', 'Una fila por tique o pedido'], day: { col: 'date' },
      cols: [
        pk('transaction_id', 'Ticket key', 'Clave del tique'), day('date', 'Day', 'Día'),
        c('timestamp', 'datetime', 'Date and time', 'Fecha y hora'),
        fk('customer_id', 'customers', 'Customer, empty if anonymous', 'Cliente, vacío si es anónimo', true),
        fk('employee_id', 'employees', 'Employee who served; empty online', 'Empleado que atendió; vacío en línea', true),
        c('channel', 'enum', 'Sales channel', 'Canal de venta', { values: E.channel }),
        c('payment_method', 'enum', 'Payment method', 'Forma de pago', { values: E.payment }),
        n('n_items', 'Units in the ticket', 'Unidades del tique'),
        m('subtotal', 'Sum of lines at list price, VAT included', 'Suma de líneas a precio de lista, IVA incluido'),
        m('discount', 'Discount given', 'Descuento aplicado'),
        m('tax', 'VAT contained in the total', 'IVA contenido en el total'),
        m('total', 'Amount paid, VAT included', 'Importe pagado, IVA incluido'),
        ...txExtra,
      ],
    },
    {
      name: 'transaction_items', d: ['One row per product line of a ticket', 'Una fila por línea de producto de un tique'], day: { col: 'transaction_id', via: 'transactions' },
      cols: [
        pk('item_id', 'Line key', 'Clave de la línea'), fk('transaction_id', 'transactions', 'Ticket', 'Tique'), fk('product_id', 'products', 'Product', 'Producto'),
        n('quantity', 'Units', 'Unidades'),
        m('unit_price', 'Price per unit that day, VAT included, before discount', 'Precio por unidad ese día, IVA incluido, antes de descuento'),
        m('discount', 'Discount on the line', 'Descuento de la línea'),
        m('line_total', 'Amount paid for the line, VAT included', 'Importe pagado por la línea, IVA incluido'),
        m('unit_cost', 'Cost per unit that day, without VAT', 'Coste por unidad ese día, sin IVA'),
        c('promo', 'bool', '1 if the product was on promotion', '1 si el producto estaba en promoción'),
      ],
    },
    {
      name: 'returns', d: ['Returned or refunded lines', 'Líneas devueltas o reembolsadas'], day: { col: 'item_id', via: 'transaction_items' },
      cols: [
        pk('return_id', 'Return key', 'Clave de la devolución'), fk('item_id', 'transaction_items', 'Line returned', 'Línea devuelta'), day('date', 'Day of the return', 'Día de la devolución'),
        n('quantity', 'Units returned', 'Unidades devueltas'), m('refund', 'Money refunded, VAT included', 'Dinero devuelto, IVA incluido'),
        c('reason', 'enum', 'Reason given', 'Motivo', { values: E.reason }), c('restocked', 'bool', '1 if the units went back on sale', '1 si las unidades volvieron a la venta'),
      ],
    },
    ...(type === 'restaurant' ? [{
      name: 'reservations', d: ['Table bookings, including no-shows and cancellations', 'Reservas de mesa, incluidas ausencias y cancelaciones'] as [string, string], day: { col: 'date' },
      cols: [
        pk('reservation_id', 'Booking key', 'Clave de la reserva'), day('date', 'Day booked', 'Día reservado'), c('time', 'datetime', 'Time booked', 'Hora reservada'),
        fk('customer_id', 'customers', 'Customer who booked', 'Cliente que reservó', true), fk('table_id', 'tables', 'Table assigned', 'Mesa asignada'),
        c('party_size', 'int', 'Guests', 'Comensales', { measure: true }), c('days_ahead', 'int', 'Days between booking and visit', 'Días entre la reserva y la visita', { measure: true }),
        c('status', 'enum', 'Outcome', 'Resultado', { values: E.resStatus }),
        fk('transaction_id', 'transactions', 'Ticket of the visit, if they came', 'Tique de la visita, si vinieron', true),
      ],
    }] : []),
    {
      name: 'purchase_orders', d: ['Orders placed with suppliers', 'Pedidos a proveedores'], day: { col: 'order_date' },
      cols: [
        pk('po_id', 'Order key', 'Clave del pedido'), fk('supplier_id', 'suppliers', 'Supplier', 'Proveedor'), fk('product_id', 'products', 'Product', 'Producto'),
        day('order_date', 'Day ordered', 'Día del pedido'), c('expected_date', 'date', 'Day promised', 'Día prometido'),
        c('received_date', 'date', 'Day received, empty while pending', 'Día de recepción, vacío si está pendiente', { nullable: true }),
        n('quantity', 'Units ordered', 'Unidades pedidas'), m('unit_cost', 'Cost per unit, without VAT', 'Coste por unidad, sin IVA'), m('total_cost', 'Order cost, without VAT', 'Coste del pedido, sin IVA'),
        c('status', 'enum', 'State of the order', 'Estado del pedido', { values: E.poStatus }),
      ],
    },
    {
      name: 'inventory_movements', d: ['Stock movements. Sales are one row per product and day', 'Movimientos de stock. Las ventas son una fila por producto y día'], day: { col: 'date' },
      cols: [
        pk('movement_id', 'Movement key', 'Clave del movimiento'), day('date', 'Day', 'Día'), fk('product_id', 'products', 'Product', 'Producto'),
        c('type', 'enum', 'Kind of movement', 'Tipo de movimiento', { values: E.movement }),
        n('quantity', 'Units, negative when stock leaves', 'Unidades, negativas cuando sale stock'), c('stock_after', 'int', 'Units in stock after the movement', 'Unidades en stock tras el movimiento'),
      ],
    },
    {
      name: 'expenses', d: ['Operating expenses, posted at the end of each month', 'Gastos de explotación, contabilizados a fin de mes'], day: { col: 'date' },
      cols: [
        pk('expense_id', 'Expense key', 'Clave del gasto'), day('date', 'Day posted', 'Día de contabilización'),
        c('type', 'enum', 'Kind of expense', 'Tipo de gasto', { values: E.expense }), m('amount', 'Amount', 'Importe'),
      ],
    },
    {
      name: 'daily_summary', d: ['One row per day with the headline numbers', 'Una fila por día con las cifras principales'], day: { col: 'date' },
      cols: [
        day('date', 'Day (primary key)', 'Día (clave primaria)'), c('is_open', 'bool', '1 if open', '1 si abrió'),
        n('visitors', 'People who came into the premises', 'Personas que entraron en el local'),
        n('online_sessions', 'Visits to the online shop', 'Visitas a la tienda en línea'),
        n('walkouts', 'Buyers lost because staff or seats were full', 'Compradores perdidos por falta de personal o de sitio'),
        n('transactions', 'Tickets', 'Tiques'), n('units', 'Units sold', 'Unidades vendidas'),
        m('gross_sales', 'Sales at list price, VAT included', 'Ventas a precio de lista, IVA incluido'), m('discounts', 'Discounts given', 'Descuentos aplicados'),
        m('revenue_net', 'Sales after discounts, without VAT', 'Ventas tras descuentos, sin IVA'), m('tax', 'VAT collected', 'IVA cobrado'),
        m('cogs', 'Cost of the goods sold', 'Coste de lo vendido'), m('gross_margin', 'revenue_net minus cogs', 'revenue_net menos cogs'),
        m('refunds', 'Money refunded that day, without VAT', 'Dinero devuelto ese día, sin IVA'), m('waste_cost', 'Cost of spoiled stock', 'Coste del stock caducado'),
        m('labour_cost', 'Cost of the shifts worked', 'Coste de los turnos trabajados'),
        m('rent_cost', 'Rent for the day', 'Alquiler del día'), m('utilities_cost', 'Energy and water for the day', 'Suministros del día'),
        m('marketing_cost', 'Marketing spend for the day', 'Gasto de marketing del día'), m('card_fees', 'Card payment fees', 'Comisiones de pago con tarjeta'),
        m('other_costs', 'Maintenance and other small costs', 'Mantenimiento y otros gastos menores'),
        m('net_profit', 'gross_margin minus refunds, waste and all the cost columns', 'gross_margin menos devoluciones, mermas y todas las columnas de coste'),
        n('new_customers', 'Identified customers buying for the first time', 'Clientes identificados que compran por primera vez'), n('returning_customers', 'Identified customers who had bought before', 'Clientes identificados que ya habían comprado'),
        n('stockout_products', 'Products with no stock at closing', 'Productos sin stock al cierre'), m('lost_sales_est', 'Estimated sales lost to empty shelves, VAT included', 'Ventas perdidas estimadas por falta de stock, IVA incluido'),
        m('inventory_value', 'Stock at cost at closing', 'Stock a coste al cierre'), c('staff_hours', 'real', 'Hours worked', 'Horas trabajadas', { measure: true }),
        m('cash_balance', 'Cash after the day: investment plus receipts minus payments', 'Caja tras el día: inversión más cobros menos pagos'),
      ],
    },
    {
      name: 'parameter_changes', d: ['Log of every slider change, to study before and after', 'Registro de cada cambio de control, para estudiar el antes y el después'],
      cols: [
        pk('change_id', 'Change key', 'Clave del cambio'), day('date', 'First day the new value applied', 'Primer día en que se aplicó el valor nuevo'),
        c('parameter', 'text', 'Parameter name', 'Nombre del parámetro'), c('old_value', 'real', 'Value before', 'Valor anterior'), c('new_value', 'real', 'Value after', 'Valor nuevo'),
      ],
    },
    {
      name: 'anomalies_key', d: ['Answer key: unusual events injected into the data', 'Solucionario: sucesos anómalos introducidos en los datos'],
      cols: [
        pk('anomaly_id', 'Anomaly key', 'Clave de la anomalía'), day('start_date', 'First day', 'Primer día'), c('end_date', 'date', 'Last day', 'Último día'),
        c('type', 'enum', 'Kind of event', 'Tipo de suceso', { values: E.anomaly }),
      ],
    },
  ];
  return t;
}

/** Tables that are answer keys: left out of exports unless asked for. */
export const KEY_TABLES = ['anomalies_key', 'dirty_data_key'];

export const SQL_TYPE: Record<ColType, string> = { id: 'INTEGER', fk: 'INTEGER', int: 'INTEGER', bool: 'INTEGER', money: 'REAL', real: 'REAL', text: 'TEXT', date: 'TEXT', datetime: 'TEXT', enum: 'TEXT' };

export const primaryKey = (t: TableDef): string => t.cols[0].name;
/** Foreign keys of a table as [column, referenced table, referenced column]. */
export function foreignKeys(t: TableDef, all: TableDef[]): [string, string, string][] {
  const out: [string, string, string][] = [];
  for (const col of t.cols) {
    if (!col.ref || (t.name === 'calendar' && col.name === 'date')) continue;
    const target = all.find(x => x.name === col.ref);
    if (target) out.push([col.name, target.name, primaryKey(target)]);
  }
  return out;
}

export const DICTIONARY_DEF: TableDef = {
  name: 'data_dictionary', d: ['What every table and column means', 'Qué significa cada tabla y columna'],
  cols: [
    c('table_name', 'text', 'Table', 'Tabla'), c('column_name', 'text', 'Column', 'Columna'), c('type', 'text', 'Data type', 'Tipo de dato'),
    c('key', 'text', 'PK, or FK and the table it points to', 'PK, o FK y la tabla a la que apunta', { nullable: true }), c('description', 'text', 'Meaning', 'Significado'),
  ],
};
export const DIRTY_KEY_DEF: TableDef = {
  name: 'dirty_data_key', d: ['Answer key: every defect added by the dirty-data switch', 'Solucionario: cada defecto añadido por el interruptor de datos sucios'],
  cols: [
    c('table_name', 'text', 'Table', 'Tabla'), c('row_number', 'int', 'Row in the exported table, starting at 1', 'Fila en la tabla exportada, empezando en 1'),
    c('column_name', 'text', 'Column, empty for a duplicated row', 'Columna, vacío si es una fila duplicada', { nullable: true }),
    c('issue', 'text', 'Kind of defect', 'Tipo de defecto'), c('clean_value', 'text', 'Value before the defect', 'Valor antes del defecto', { nullable: true }),
  ],
};
