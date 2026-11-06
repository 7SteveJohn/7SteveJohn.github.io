async function check() {
  const res = await fetch('https://7stevejohn.github.io/');
  const text = await res.text();
  console.log('Has v236 in live HTML:', text.includes('v236'));
  console.log('Has __inlineTiltBound in live HTML:', text.includes('__inlineTiltBound'));
}
check().catch(console.error);
