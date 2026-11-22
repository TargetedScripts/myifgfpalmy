// js/seed-sunday-services.js
import { db } from "./firebase-config.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cleanUrl = (val) => {
  if (!val || val.trim() === "-") return "";
  return val.trim();
};

export const SUNDAY_SERVICES_2026 = [
  {
    service_date: "2026-11-22",
    title: "Sunday Service",
    speaker: "Tikva Mooy",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/11/22-Nov-2026.png"),
    youtube_url: cleanUrl("-"),
    post_url: cleanUrl("-")
  },
  {
    service_date: "2026-11-15",
    title: "From Prison To Palace",
    speaker: "Tedy Sutedja",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/11/15-Nov-2026_20261111_002937_0000.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/puX3FSCxjcY?si=rPYXZYzC59lnwGfw"),
    post_url: cleanUrl("-")
  },
  {
    service_date: "2026-11-08",
    title: "What About Me",
    speaker: "Ps. Jack Christi Nussi",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/11/8-Nov-2026.png"),
    youtube_url: cleanUrl("https://www.youtube.com/watch?v=kLlD0XOYkSQ"),
    post_url: cleanUrl("-")
  },
  {
    service_date: "2026-11-01",
    title: "Sunday Service",
    speaker: "Sendiron Enumbi",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/10/1-Nov-2026.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/--yhy3Lk30w?si=gguenX-f34Fn5ear"),
    post_url: cleanUrl("-")
  },
  {
    service_date: "2026-10-25",
    title: "When God Draws the Line",
    speaker: "Tedy Sutedja",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/10/25-Oct-2026_20261020_023028_0000.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/7JDQfDI0SdI?si=LnvmTaLanITiWO5i"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/10/26/when-god-draws-the-line/")
  },
  {
    service_date: "2026-10-18",
    title: "Sunday Service",
    speaker: "Tikva Mooy",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/10/18-Oct-2026.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/CI3J_FLcgdU?si=_s35jGfpxLDtI5mV"),
    post_url: cleanUrl("-")
  },
  {
    service_date: "2026-10-11",
    title: "Sunday Service",
    speaker: "Ps. Simon Luhur",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/10/4-Oct-2026_20261007_150745_0000.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/v_27yHUiLTo"),
    post_url: cleanUrl("-")
  },
  {
    service_date: "2026-10-04",
    title: "Sunday Service",
    speaker: "Sendiron Enumbi",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/10/4-Oct-2026_20261001_205602_0000.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/Vzf45t3tXuQ?si=ys1G8cXpcyobcajP"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/10/05/2008/")
  },
  {
    service_date: "2026-09-27",
    title: "Sunday Service",
    speaker: "Tedy Sutedja",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/09/27-Sep-2026.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/IbyzwPlHX60?si=mTtb055Rvnaukkk5"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/09/28/sebelum-fajar-dia-sudah-bekerja/")
  },
  {
    service_date: "2026-09-20",
    title: "Kebesaran Tuhan Seporsi Kekalahan",
    speaker: "Tikva Mooy",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/09/20-Sep-2026.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/DwLSIaFbo4o?si=TI3s2dc9BCoK4LdE"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/09/28/1954/")
  },
  {
    service_date: "2026-09-13",
    title: "Sunday Service",
    speaker: "Ps. Anthony Otto",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/09/13-Sep-2026.png"),
    youtube_url: cleanUrl("https://youtube.com/live/HxFAsPYGm10"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/09/28/1957/")
  },
  {
    service_date: "2026-09-06",
    title: "Sunday Service",
    speaker: "Sendiron Enumbi",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/09/6-Sep-2026.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/9g6lSvo3nTo?si=ILYUBc-hnHByCFiw"),
    post_url: cleanUrl("-")
  },
  {
    service_date: "2026-09-05",
    title: "Worship Night",
    speaker: "Tedy Sutedja",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/08/HWN.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/tuvdzojN--Y?si=uodueJYHOjk6UR6x"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/09/29/1981/")
  },
  {
    service_date: "2026-08-30",
    title: "Sunday Service",
    speaker: "Tedy Sutedja",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/08/30-Aug-2026.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/OaUgNPffuqI?si=7i-duKhYuIzQR_3r"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/09/28/1945/")
  },
  {
    service_date: "2026-08-23",
    title: "Sunday Service",
    speaker: "Tikva Mooy",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/08/23-Aug-2026.png"),
    youtube_url: cleanUrl("https://youtube.com/live/mvVDi5S2hJ8"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/09/28/1963/")
  },
  {
    service_date: "2026-08-16",
    title: "Sunday Service",
    speaker: "Sendiron Enumbi",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/08/16-Aug.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/3w43NofAp_M?si=F3XRy90yYV1cpiBo"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/09/28/1960/")
  },
  {
    service_date: "2026-08-09",
    title: "Sunday Service",
    speaker: "Tedy Sutedja",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/08/9-Aug-2026.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/QWg1lHRwXhE?si=xAmIHQ6xbWuBYRJW"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/09/28/1951/")
  },
  {
    service_date: "2026-08-02",
    title: "Sunday Service",
    speaker: "Ps. Jack Christi Nussi",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/07/2-Aug-2026_20260731_165303_0000.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/nceJ5TOkw40?si=3SZmpKsnI56olvOe"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/09/29/1970/")
  },
  {
    service_date: "2026-07-26",
    title: "Sunday Service",
    speaker: "Tikva Mooy",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/07/Poster-Mourning-into-Dancing.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/2J2lX1NUNHA?si=c9pQdXLFgUP-amoU"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/09/29/1975/")
  },
  {
    service_date: "2026-07-19",
    title: "Sunday Service",
    speaker: "Sendiron Enumbi",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/07/19-July-2026.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/5W-9u1Grabk?si=Od-5VK7ysjSXUzg0"),
    post_url: cleanUrl("-")
  },
  {
    service_date: "2026-07-12",
    title: "Church Anniversary",
    speaker: "Ps. Simon Luhur",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/07/35-Matipo-St-Palmerston-North.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/8PGVijDaYHo?si=aDFDB5v0whjW3DuX"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/10/04/2003/")
  },
  {
    service_date: "2026-07-05",
    title: "Sunday Service",
    speaker: "Tedy Sutedja",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/06/Poster05072026.png"),
    youtube_url: cleanUrl("https://www.youtube.com/live/RiZwSavIL0Y?si=8bqA8Bq21OYXeDcr"),
    post_url: cleanUrl("https://ifgfpalmy.org/2026/09/29/1978/")
  },
  {
    service_date: "2026-06-28",
    title: "Sunday Service",
    speaker: "Tikva Mooy",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/06/Poster28062026_20260625_063458_0000.png"),
    youtube_url: cleanUrl("-"),
    post_url: cleanUrl("-")
  },
  {
    service_date: "2026-06-21",
    title: "Sunday Service",
    speaker: "Sendiron Enumbi",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/06/Poster210626v1.png"),
    youtube_url: cleanUrl("-"),
    post_url: cleanUrl("-")
  },
  {
    service_date: "2026-06-14",
    title: "Sunday Service",
    speaker: "Ps. Sariwati - Bandung",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/06/Poster140626_20260611_034157_0000.png"),
    youtube_url: cleanUrl("-"),
    post_url: cleanUrl("-")
  },
  {
    service_date: "2026-06-13",
    title: "iCare Fellowship: New Season",
    speaker: "Ps. Sariwati - Bandung",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/06/Poster-Icare_20260611_022006_0000.png"),
    youtube_url: cleanUrl("-"),
    post_url: cleanUrl("-")
  },
  {
    service_date: "2026-06-07",
    title: "Ketika Tuhan Berjanji",
    speaker: "Tikva Mooy",
    poster_url: cleanUrl("https://ifgfpalmy.org/wp-content/uploads/2026/06/Poster2606071.png"),
    youtube_url: cleanUrl("-"),
    post_url: cleanUrl("-")
  }
];

export async function seedSundayServices2026() {
  let count = 0;
  for (const item of SUNDAY_SERVICES_2026) {
    const docId = item.service_date;
    await setDoc(
      doc(db, "sunday_services", docId),
      {
        ...item,
        published: true,
        updated_at: serverTimestamp()
      },
      { merge: true }
    );
    count += 1;
  }
  return count;
}
