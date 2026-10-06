import pool from '../Config/database.js';

export const getStates = async (req, res) => {
  try {
    console.log('GET /states called by user:', req.user);
    const result = await pool.query(`
      SELECT id, state_name
      FROM state
      ORDER BY state_name ASC
    `);

    console.log(`GET /states returning ${result.rows.length} states`);
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get states error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states'
    });
  }
};

export const getCities = async (req, res) => {
  const { state_id } = req.query;
  console.log('GET /cities called with state_id:', state_id, 'by user:', req.user);

  try {
    const cityColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'city'
    `);
    const columnNames = cityColumns.rows.map((row) => row.column_name);
    // Added 'fkstate' here to match the database column name
    const stateColumn = ['state_id', 'fk_state', 'fkstate'].find((column) => columnNames.includes(column));
    console.log('Detected state column in city table:', stateColumn);

    let query = 'SELECT id, city_name FROM city';
    const params = [];

    if (state_id && stateColumn) {
      query += ` WHERE ${stateColumn} = $1`;
      params.push(state_id);
    }

    query += ' ORDER BY city_name ASC';

    const result = await pool.query(query, params);
    console.log(`GET /cities returning ${result.rows.length} cities`);
    if (result.rows.length === 0 && state_id) {
      console.warn(`[WARNING] GET /cities: State ID ${state_id} has no cities in the database.`);
    }

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cities'
    });
  }
};

