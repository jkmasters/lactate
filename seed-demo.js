/* Paste into the browser console at localhost:5173 for three fake tests,
   three months apart, showing pace at 4 mmol improving while HR holds.
   Enough to make Analyze's Overlay and Trend views worth looking at.
   Delete this file once there is real data. */
(() => {
  const mk = (id, date, label, athlete, st) => ({
    id, athlete, date, label, hrMax: 175, dist: 2400, temp: "", wind: "", notes: "",
    rows: st.map(([min, sec, hr, lact], i) => ({
      n: i + 1, target: 127 + i * 8, note: "", hr, lact: String(lact),
      min: String(min), sec: String(sec),
    })),
  });
  const demo = [
    mk(1000, "2026-05-20", "Early season", "Jake",
       [[10,5,149,1.3],[9,30,157,1.7],[9,0,164,2.4],[8,30,170,3.6],[8,5,174,5.6]]),
    mk(1001, "2026-07-08", "Mid season", "Jake",
       [[9,50,148,1.2],[9,15,156,1.5],[8,45,163,2.1],[8,15,169,3.1],[7,50,174,5.0]]),
    mk(1002, "2026-08-28", "Late season", "Jake",
       [[9,31,148,1.2],[9,0,155,1.4],[8,30,162,1.9],[8,0,168,2.8],[7,35,173,4.5],[7,15,175,6.9]]),
  ];
  const cur = JSON.parse(localStorage.getItem("lactate:sessions") || "[]");
  localStorage.setItem("lactate:sessions", JSON.stringify([...demo, ...cur]));
  location.href = "/";
})();
