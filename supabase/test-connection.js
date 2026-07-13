const supabase = require('./client');

async function main() {
  const { data, error } = await supabase.from('usuarios').select('*').limit(5);

  if (error) {
    console.error('Falha na conexao com o Supabase:', error.message);
    process.exit(1);
  }

  console.log('Conexao com o Supabase OK. Registros em usuarios:', data);
}

main();
