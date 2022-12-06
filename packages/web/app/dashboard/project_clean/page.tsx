import Table from './Table';

async function getData() {
  const res = await fetch('http://localhost:3000/api/unused');
  return res.json();
}

export default async function Page() {
  const data = await getData();

  if (data.length) {
    return <Table data={data} />;
  }

  return null;
}
