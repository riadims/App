import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import methodOverride from 'method-override';

// aplikacija delana z uporabom type : module ker je developer navajen na to
console.log("Riad Imsirovic");

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "nepremicnine",
  password: "Riki1234",
  port: 5432,
});
db.connect();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(methodOverride('_method'));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// prikaz vseh zaposlenih
app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM Zaposleni");
    res.render("index", { zaposleni: result.rows });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// prikaz detalja izbranega zaposlenega
app.get("/zaposleni/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const zaposleniResult = await db.query(
      "SELECT * FROM Zaposleni WHERE ID_Zaposleni = $1",
      [id]
    );
    const nepremicnineResult = await db.query(
      "SELECT * FROM Nepremicnina WHERE ID_Zaposleni = $1",
      [id]
    );
    const sorodnikResult = await db.query(
      "SELECT * FROM Sorodnik WHERE ID_Zaposleni = $1",
      [id]
    );
    const oglediResult = await db.query(`
      SELECT o.id_ogled, o.datum, o.komentar, n.naslov as naslov_nepremicnina, s.ime as ime_stranka, s.priimek as priimek_stranka, s.telefon as telefon_stranka
      FROM Ogled o
      JOIN Stranka s ON o.id_stranka = s.id_stranka
      JOIN Nepremicnina n ON o.id_nepremicnina = n.id_nepremicnina
      WHERE o.id_zaposleni = $1`, [id]
    );
      const razgovoriResult = await db.query(
        `SELECT r.id_razgovor, r.datum, r.komentar, s.ime as ime_stranka, s.priimek as priimek_stranka, s.telefon as telefon_stranka, s.naslov as naslov_stranka, s.zelentipnepremicnine as zelentipnepremicnine_stranka, s.zelenakvadratura as zelenakvadratura_stranka, s.faks as faks_stranka, s.maksimalnamesecnanajemnina as maksimalnamesecnanajemnina_stranka 
         FROM Razgovor r
         JOIN Stranka s ON r.id_stranka = s.id_stranka
         WHERE r.id_zaposleni = $1`,
        [id]
    );
    const preglediResult = await db.query(
      `SELECT p.id_pregled, p.datum, p.komentar, n.naslov
       FROM Pregled p
       JOIN Nepremicnina n ON p.id_nepremicnina = n.id_nepremicnina
       WHERE p.id_zaposleni = $1`,
      [id]
    );
    const strankeResult = await db.query(
      "SELECT * FROM Stranka"
  );

    res.render("zaposleni", {
      zaposleni: zaposleniResult.rows[0],
      nepremicnine: nepremicnineResult.rows,
      sorodnik: sorodnikResult.rows,
      ogledi: oglediResult.rows,
      razgovori: razgovoriResult.rows,
      pregledi: preglediResult.rows,
      stranke: strankeResult.rows
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// prikaz edit forme za zaposlenega
app.get("/zaposleni/:id/edit", async (req, res) => {
  const id = req.params.id;
  try {
    const zaposleniResult = await db.query(
      "SELECT * FROM Zaposleni WHERE ID_Zaposleni = $1",
      [id]
    );

    res.render("edit_zaposleni", { zaposleni: zaposleniResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// urejanje/edit podatkov zaposlenega
app.put("/zaposleni/:id", async (req, res) => {
  const id = req.params.id;
  const { ime, priimek, naslov, telefon, faks} = req.body;

  try {
    await db.query(
      "UPDATE Zaposleni SET ime = $1, priimek = $2, naslov = $3, telefon = $4, faks = $5 WHERE ID_Zaposleni = $6",
      [ime, priimek, naslov, telefon, faks, id]
    );
    res.redirect(`/zaposleni/${id}`);
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// prikaz edit forme za sorodnika
app.get("/zaposleni/:id/sorodnik/edit", async (req, res) => {
  const id = req.params.id;
  try {
    const sorodnikResult = await db.query(
      "SELECT * FROM Sorodnik WHERE ID_Zaposleni = $1",
      [id]
    );

    res.render("edit_sorodnik", { sorodnik: sorodnikResult.rows[0], zaposleniId: id });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// sprememba/edit sorodnika
app.put("/zaposleni/:id/sorodnik", async (req, res) => {
  const id = req.params.id;
  const { ime, priimek, telefon, naslov, relacija } = req.body;

  try {
    await db.query(
      "UPDATE Sorodnik SET ime = $1, priimek = $2, telefon = $3, naslov = $4, relacija = $5 WHERE ID_Zaposleni = $6",
      [ime, priimek, telefon, naslov, relacija, id]
    );
    res.redirect(`/zaposleni/${id}`);
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});


// sprmeemba statusa nepremicnine
app.post("/nepremicnina/:id_nepremicnina/update", async (req, res) => {
  const id_nepremicnina = req.params.id_nepremicnina;
  const { status } = req.body;

  try {
      await db.query(
          "UPDATE Nepremicnina SET status = $1 WHERE id_nepremicnina = $2",
          [status, id_nepremicnina]
      );
      res.redirect("back");
  } catch (err) {
      console.error(err);
      res.send("Error " + err);
  }
});

// obdelava kreacije novega pregleda
app.post("/zaposleni/:id/pregled", async (req, res) => {
  const id_zaposleni = req.params.id;
  const { id_nepremicnina, datum, komentar } = req.body;

  try {
      await db.query(
          "INSERT INTO Pregled (id_zaposleni, id_nepremicnina, datum, komentar) VALUES ($1, $2, $3, $4)",
          [id_zaposleni, id_nepremicnina, datum, komentar]
      );
      res.redirect(`/zaposleni/${id_zaposleni}`);
  } catch (err) {
      console.error(err);
      res.send("Error " + err);
  }
});

// obdelava kreacije novega razgovora
app.post("/zaposleni/:id/razgovor", async (req, res) => {
  const id_zaposleni = req.params.id;
  const { id_stranka, datum, komentar, ime_novo, priimek_novo, telefon_novo, naslov_novo, faks_novo, zelentipnepremicnine_novo, zelenakvadratura_novo, maksimalnamesecnanajemnina_novo } = req.body;
  let newStrankaId = id_stranka;

  try {
      // dodaja nove stranke če je vnesena
      if (ime_novo && priimek_novo) {
          const newStrankaResult = await db.query(
              "INSERT INTO Stranka (ime, priimek, telefon, naslov, faks, zelentipnepremicnine, zelenakvadratura, maksimalnamesecnanajemnina) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_stranka",
              [ime_novo, priimek_novo, telefon_novo, naslov_novo, faks_novo, zelentipnepremicnine_novo, zelenakvadratura_novo, maksimalnamesecnanajemnina_novo]
          );
          newStrankaId = newStrankaResult.rows[0].id_stranka;
      }

      // insert novega razgovora
      await db.query(
          "INSERT INTO Razgovor (id_zaposleni, id_stranka, datum, komentar) VALUES ($1, $2, $3, $4)",
          [id_zaposleni, newStrankaId, datum, komentar]
      );
      res.redirect(`/zaposleni/${id_zaposleni}`);
  } catch (err) {
      console.error(err);
      res.send("Error " + err);
  }
});

app.post("/zaposleni/:id/ogled", async (req, res) => {
  const id_zaposleni = req.params.id;
  const { id_stranka, id_nepremicnina, datum, komentar } = req.body;

  try {
      await db.query(
          "INSERT INTO Ogled (id_zaposleni, id_stranka, id_nepremicnina, datum, komentar) VALUES ($1, $2, $3, $4, $5)",
          [id_zaposleni, id_stranka, id_nepremicnina, datum, komentar]
      );
      res.redirect(`/zaposleni/${id_zaposleni}`);
  } catch (err) {
      console.error(err);
      res.send("Error " + err);
  }
});

app.get("/journals", async (req, res) => {
  try {
    const allZaposleni = await db.query("SELECT * FROM Zaposleni");

    res.render("journals", {
      allZaposleni: allZaposleni.rows
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.get("/journals/view", async (req, res) => {
  const id_zaposleni = req.query.id_zaposleni;

  try {
    const dokumentacijaResult = await db.query(
      "SELECT datum, komentar FROM Dokumentacija WHERE ID_Zaposleni = $1 ORDER BY datum DESC",
      [id_zaposleni]
    );
    const zaposleniResult = await db.query(
      "SELECT ime, priimek FROM Zaposleni WHERE ID_Zaposleni = $1",
      [id_zaposleni]
    );

    res.render("view_journal", {
      dokumentacija: dokumentacijaResult.rows,
      zaposleni: zaposleniResult.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// Obdelava novega vnosa v dnevnik
app.post("/zaposleni/:id/add-journal", async (req, res) => {
  const id_zaposleni = req.params.id;
  const { komentar } = req.body;
  const datum = new Date(); // trenutni datum

  try {
      await db.query(
          "INSERT INTO Dokumentacija (id_zaposleni, datum, komentar) VALUES ($1, $2, $3)",
          [id_zaposleni, datum, komentar]
      );
      res.redirect(`/zaposleni/${id_zaposleni}`);
  } catch (err) {
      console.error(err);
      res.send("Error " + err);
  }
});