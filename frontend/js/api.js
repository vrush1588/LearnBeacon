export async function searchEducationQuery(query) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function getCollegesOnMap(query) {
  const res = await fetch(`/api/colleges/map?q=${encodeURIComponent(query)}`);
  return res.json();
}
