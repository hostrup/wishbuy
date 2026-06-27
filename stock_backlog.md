# 📈 Backlog & Specifikation: Aktiemonitorering (Hostrup Hub)

Dette dokument beskriver udvidelsen af **Hostrup Hub** (tidligere `wishbuy`) med en ny, fuldt integreret side: **Aktier** (`/dashboard/stocks`). 

Formålet med siden er at give Ronni og Mathilde et visuelt, pædagogisk og letforståeligt overblik over deres fælles investeringer. Systemet tager udgangspunkt i AI-modelporteføljen købt den **4. juni 2026**, men understøtter fuldt ud, at brugerne kan tilføje nye transaktioner (køb og salg) på givne datoer samt udføre løbende analyser.

---

## 📖 1. Pædagogisk Aktie-Matematik (Aktier for Voksne)

For at gøre siden forståelig for almindelige voksne danskere, skal systemet formidle finansielle begreber på en jordnær og visuel måde. Her er de vigtigste begreber forklaret med udgangspunkt i porteføljen:

### 1.1 Kostpris & Anskaffelsespris (Hvad har det reelt kostet?)
*   **Hvad betyder det?** Kostprisen er det samlede beløb, du har betalt for dine aktier, *inklusive* alle de gebyrer, som banken (Nordnet) tager for at gennemføre handlen.
*   **Nordnets gebyrstruktur:**
    *   **Minimumskurtage:** 25 kr. pr. handel (det koster det altid at købe/sælge amerikanske aktier).
    *   **Valutavekslingsgebyr:** 0,25% af det beløb, der veksles (når du køber amerikanske aktier i dollars med en dansk konto).
*   **Eksempel (Broadcom - AVGO):**
    *   Du køber 1 aktie til **$406,14** ved en dollarkurs på **6,44 DKK/USD**.
    *   Ren aktiepris i DKK: $406,14 × 6,44 = **2.615,54 kr.**
    *   Gebyrer: Valutaveksling (2.615,54 kr. × 0,25%) = **6,54 kr.** + Kurtage = **25,00 kr.**
    *   **Reel Kostpris:** 2.615,54 kr. + 6,54 kr. + 25,00 kr. = **2.647,08 kr.**
    *   *Lærepenge:* Fordi kurtagen er en fast flad takst (25 kr.), betaler du en relativt høj procentdel i gebyr, hvis du køber meget små portioner. Derfor bør porteføljen holdes stabil.

### 1.2 Urealiseret Afkast (Hvad er gevinsten lige nu?)
*   **Hvad betyder det?** "Urealiseret" betyder, at pengene kun er på papiret. Du har ikke solgt aktierne endnu. Hvis du sælger dem i dag, bliver afkastet "realiseret" (og du skal betale skat af gevinsten).
*   **Valuta-stødpuden (USD/DKK):**
    *   Dine aktier er i amerikanske dollars (USD), men din portefølje måles i danske kroner (DKK).
    *   Hvis dollarkursen stiger (dollaren bliver stærkere mod kronen), bliver dine aktier mere værd i danske kroner, selvom selve aktiekursen i USA ikke har flyttet sig.
    *   **Eksempel (Palantir - PLTR):** Hvis PLTR falder 6% i USA, men dollaren stiger 1% i forhold til den danske krone, så falder din position kun med ca. 5% i danske kroner. Dollaren virker som en stødpude.

### 1.3 P/E-tallet (Pris vs. Reel indtjening)
*   **Hvad betyder det?** P/E står for *Price-to-Earnings* (Pris divideret med Indtjening pr. aktie). Det fortæller, hvor mange års indtjening du betaler for at eje virksomheden.
*   **Historien om de to Pizzeriaer (PLTR vs. GOOGL):**
    *   **Google (P/E 27):** Forestil dig et lokalt, veletableret pizzeria. Det tjener 10.000 kr. om året. Ejeren vil sælge det til dig for **270.000 kr.** Det svarer til en P/E på 27. Hvis indtjeningen aldrig vokser, tager det 27 år, før du har tjent din investering hjem. Det er stabilt og relativt billigt.
    *   **Palantir (P/E 160):** Forestil dig nu et nyt, hipt pizzeria, der har udviklet en robot, der kan lave pizzaer på 10 sekunder. Det tjener også 10.000 kr. om året lige nu, men ejeren vil have **1.600.000 kr.** for det! Det er en P/E på 160. Hvorfor betale det? Fordi du forventer, at de inden for få år åbner 50 nye robot-pizzeriaer, så indtjeningen eksploderer. Hvis de gør det, bliver pizzeriaet hurtigt billigt. Hvis de fejler, har du betalt alt for meget. Det er en **joker-position**.

### 1.4 Trailing P/E vs. Forward P/E
*   **Trailing P/E:** Baseret på den indtjening, selskabet *faktisk har haft* de seneste 12 måneder (historisk data).
*   **Forward P/E:** Baseret på hvad analytikere *forventer*, at selskabet vil tjene de næste 12 måneder.
*   *Hvorfor er det vigtigt?* Hvis en vækstaktie har en Trailing P/E på 90, men en Forward P/E på 35, betyder det, at indtjeningen forventes at stige voldsomt meget meget hurtigt. Det gør den høje pris mere spiselig.

### 1.5 EPS (Indtjening pr. aktie) & EPS CAGR
*   **EPS (Earnings Per Share):** Virksomhedens samlede overskud efter skat delt med antallet af aktier. Hvis Google tjener 100 mio. kr. og har 10 mio. aktier, er EPS **10 kr.**
*   **EPS CAGR (Compound Annual Growth Rate):** Den gennemsnitlige årlige vækstrate i indtjeningen over f.eks. 5 år. Hvis indtjeningen vokser med en CAGR på 20%, betyder det, at overskuddet stiger med 20% hvert år (rentes rente-effekten).

### 1.6 Multipel-kompression (Hvorfor en god virksomhed kan give 0% afkast)
*   **Hvad betyder det?** Selvom en virksomhed tjener flere og flere penge, kan aktiekursen falde eller stå stille, hvis markedet beslutter, at P/E-tallet skal være lavere (multiplen skrumper).
*   **Eksempel (Palantir - PLTR):**
    *   **I dag:** EPS er $0,91 og P/E er 160x. Kursen er **$146**.
    *   **Om 5 år:** Palantir gør det fantastisk! Indtjeningen stiger med 35% om året. EPS er nu **$4,09** (mere end en firedobling!).
    *   **Men:** Hype er drevet over, og markedet vil nu kun betale en P/E på 35x.
    *   **Fremtidig Kurs:** $4,09 (EPS) × 35 (P/E) = **$143**.
    *   *Resultat:* +349% stigning i indtjening, men **0% afkast** på aktiekursen. Hele væksten blev spist af, at markedet gik fra at være super-optimistisk (P/E 160) til at være realistisk (P/E 35).

---

## 📊 2. Det Initiale Portefølje-Grundlag (Køb: 4. juni 2026)

Udgangspunktet for systemet er den etablerede portefølje:

| Ticker | Virksomhed | Antal | Købskurs (USD) | Kostpris i DKK (inkl. gebyrer) | AI-rolle / Tese | Tesebrud-signal (Sælg hvis...) |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **NVDA** | NVIDIA Corp. | 2 | $212,297 | 2.766 kr. | **GPU compute:** Ubestridt markedsleder på AI-acceleratorer. CUDA-software binder kunderne. | Markedsandel falder under 75%. Omsætningsvækst under 30% y/y. |
| **AVGO** | Broadcom Inc. | 1 | $406,140 | 2.647 kr. | **Custom ASIC & Netværk:** Vinder af hyperscalernes skift mod egne chips (TPU/MTIA). | AI-omsætningsvækst under 50% y/y. Mister en stor kunde (Google/Meta). |
| **GOOGL** | Alphabet Inc. | 1 | $366,025 | 2.387 kr. | **Cloud & Modeller:** Billigste mega-cap AI-aktie (P/E 27). Fuldt integreret fra chip til Gemini. | Cloud-vækst falder under 30% y/y. Søge-indtægter falder pga. AI-chatbots. |
| **PLTR** | Palantir Tech. | 2 | $146,093 | 1.915 kr. | **AI software (Joker):** AIP-platformen er enterprise AI-operativsystemet. Hypervækst. | Vækst falder under 40% y/y. GAAP-margin falder under 30%. |
| **Total** | | **6** | | **9.715 kr.** | Samlet investeret: **$1.488,95** (dollarkurs 6,44). | |

---

## 🖥️ 3. Brugergrænseflade & UI Design (UX/UI)

Siden skal implementeres i overensstemmelse med Hostrup Hubs **glassmorphism-designsystem** (Deep Forest-temaet: `bg-slate-50 dark:bg-slate-950` med mørkegrønne og elektrisk indigo accenter).

### 3.1 Hovedlayout (`/dashboard/stocks`)
1.  **KPI Top-bjælke (Glassmorphism-kort):**
    *   **Porteføljeværdi:** Vises stort i DKK (f.eks. `9.400 kr.`) med sekundær USD-værdi nedenunder.
    *   **Urealiseret Afkast:** Vises i kr. og % (f.eks. `-315 kr. (-3,24%)` med rød farve ved tab, grøn ved gevinst).
    *   **Kostpris:** Samlet investeret beløb inklusive gebyrer (`9.715 kr.`).
    *   **USD/DKK Kurs:** Den aktuelle valutakurs med indikator for ændring.
2.  **Visuel Performance-Bar (Målscenarier dec. 2026):**
    En vandret statusbar, der placerer den aktuelle porteføljeværdi i forhold til de tre beregnede 6-måneders scenarier:
    ```text
    [─ Krise (7.000 kr.) ─────── Kostpris (9.715 kr.) ─── Solidt (10.948 kr.) ─── Base Case (12.140 kr.) ─── Eufori (15.102 kr.) ─]
                                                  ▲
                                           DU ER HER: 9.400 kr.
    ```
3.  **Porteføljetabel (Transaktionsliste og Aktuelle Kurser):**
    *   Viser Ticker, Selskab, Antal, Kostpris pr. aktie, Aktuel kurs (USD), Urealiseret afkast pr. position (DKK/USD/%), samt en visuel status på investeringstesen (f.eks. en grøn tjekmark 🟢 eller en rød advarselstrekant ⚠️).
4.  **Interaktive Grafer (ApexCharts):**
    *   **Allokeringsdiagram (Donut):** Viser porteføljens fordeling (f.eks. NVDA 28.5%, AVGO 27.3%, GOOGL 24.6%, PLTR 19.6%). Farverne skal trækkes fra CSS-variablerne (`--color-indigo-500`, `--color-violet-500` osv.) for at understøtte lys/mørk tilstand.
    *   **Historisk Udvikling (Line/Area):** Viser den akkumulerede værdi af porteføljen over tid vs. den samlede kostpris.

### 3.2 🎛️ Den Interaktive 5-års Scenarie-Simulator
Dette er en særlig, visuel komponent, hvor Mathilde og Ronni kan eksperimentere med fremtiden.
*   **Funktion:** Brugeren kan vælge en aktie (f.eks. Palantir) og justere to sliders:
    1.  **Forventet årlig indtjeningsvækst (EPS CAGR):** Fra 0% til 60%.
    2.  **Terminal P/E-multipel (hvad markedet vil betale om 5 år):** Fra 15x til 200x.
*   **Visuel feedback:** Siden udregner øjeblikkeligt den fremtidige aktiekurs og det samlede afkast om 5 år (juni 2031) ud fra formlen:
    $$\text{Fremtidig Kurs} = (\text{EPS i dag} \times (1 + \text{CAGR})^5) \times \text{Terminal P/E}$$
    Hvis kombinationen resulterer i negativt afkast på trods af høj vækst (multipel-kompression), vises en pædagogisk forklaring: *"Selvom Palantir vokser med 35% om året, falder aktien, fordi markedet ikke længere vil betale P/E 160, men kun P/E 30."*

### 3.3 🃏 Joker-Duel Tracker: PLTR vs. ALAB
Da Palantir blev valgt i en duel mod Astera Labs (ALAB), skal der være en dedikeret sektion, der sammenligner de to selskabers seneste kvartalstal (omsætningsvækst, P/E-tal, marginer) direkte i UI'en, så man nemt kan vurdere, om der skal foretages en rotation.

---

## 💾 4. Datamodel & Database (Prisma PostgreSQL)

For at understøtte historik, transaktioner og løbende opdateringer af aktiekurser, skal Prisma-skemaet udvides med fire nye modeller.

```prisma
// Følgende modeller tilføjes til prisma/schema.prisma

model Stock {
  id                 String             @id @default(cuid())
  ticker             String             @unique // F.eks. "NVDA", "PLTR"
  name               String             // F.eks. "NVIDIA Corp."
  currency           String             @default("USD")
  description        String             @db.Text
  investmentThesis   String             @db.Text // Hvorfor købte vi den?
  breakThesisSignal  String             @db.Text // Hvornår skal vi sælge?
  isActive           Boolean            @default(true)
  
  // Nøgletal (opdateres via API)
  currentPrice       Float
  peTrailing         Float?
  peForward          Float?
  epsTTM             Float?
  epsCAGR5Year       Float?             // Forventet langsigtet vækst
  
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  
  transactions       StockTransaction[]
  dailyPrices        StockPriceDaily[]
}

model StockTransaction {
  id             String          @id @default(cuid())
  stockId        String
  stock          Stock           @relation(fields: [stockId], references: [id], onDelete: Cascade)
  type           StockTransType  // BUY eller SELL
  date           DateTime
  shares         Float           // Antal aktier (understøtter brøkdele)
  priceUsd       Float           // Pris pr. aktie i USD (eller den givne valuta)
  rateDkkUsd     Float           // USD/DKK kursen på handelsdagen (f.eks. 6.44)
  brokerageDkk   Float           @default(25.0) // Kurtage i DKK
  exchangeFeeDkk Float           @default(0.0)  // Valutavekslingsgebyr i DKK (typisk 0.25% af summen)
  comment        String?         @db.Text       // Evt. note til handlen
  
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

enum StockTransType {
  BUY
  SELL
}

model StockPriceDaily {
  id        String   @id @default(cuid())
  stockId   String
  stock     Stock    @relation(fields: [stockId], references: [id], onDelete: Cascade)
  date      DateTime
  closePrice Float   // Slutkurs i USD (eller handelsvaluta)
  
  @@unique([stockId, date])
}

model ExchangeRateDaily {
  id        String   @id @default(cuid())
  base      String   @default("USD")
  target    String   @default("DKK")
  date      DateTime
  rate      Float
  
  @@unique([base, target, date])
}
```

---

## 🔌 5. Datastyring & API Integration

For at undgå dyre abonnementer skal vi hente kurser og valutadata via gratis eller semi-gratis API'er.

### 5.1 Valg af API & Data-kilde
*   **Aktiekurser & Finansielle Nøgletal (P/E, EPS):** Vi benytter **Yahoo Finance API** (via et uofficielt men stabilt endpoint eller en gratis wrapper som `yahoo-finance2` til Node.js). Yahoo Finance leverer forsinkede realtidskurser samt alle de nødvendige nøgletal gratis.
*   **Valutakurser (USD/DKK):** Vi benytter **Open Exchange Rates** (gratis plan med 1.000 kald/md) eller **Frankfurter API** (100% gratis og open source valutakurs-API drevet af EU's ECB-data).

### 5.2 Baggrundsopdatering (Cronjob / Scheduler)
For at sikre hurtige indlæsningstider må vi ikke kalde de eksterne API'er synkront, når brugeren indlæser siden. I stedet caches priserne i databasen:
*   **Hver time (i markedets åbningstid 15:30-22:00 dansk tid):** En baggrundsopgave opdaterer `currentPrice` i `Stock`-tabellen.
*   **Hver nat kl. 23:00:** 
    *   Dagens slutkurser gemmes i `StockPriceDaily` (til historisk graf).
    *   Nøgletal (`peTrailing`, `peForward`, `epsTTM`) genindhentes og opdateres.
    *   Dagens valutakurs gemmes i `ExchangeRateDaily`.

#### Eksempel på API-Fetcher i Node.js/SvelteKit server-side:
```typescript
import yahooFinance from 'yahoo-finance2';
import { prisma } from '$lib/server/prisma';

export async function updateStockPrices() {
  const stocks = await prisma.stock.findMany({ where: { isActive: true } });
  
  for (const stock of stocks) {
    try {
      // Hent quote fra Yahoo Finance
      const quote = await yahooFinance.quote(stock.ticker);
      
      await prisma.stock.update({
        where: { id: stock.id },
        data: {
          currentPrice: quote.regularMarketPrice,
          peTrailing: quote.trailingPE || null,
          peForward: quote.forwardPE || null,
          epsTTM: quote.epsTrailingTwelveMonths || null,
        }
      });
    } catch (error) {
      console.error(`Kunne ikke opdatere ${stock.ticker}:`, error);
    }
  }
}
```

---

## 🔒 6. Authelia Sikkerhedspolitik

Da aktieporteføljen indeholder følsomme personlige finansielle oplysninger, skal adgangen sikres strengt i overensstemmelse med **Authelia Sikkerhedspolitik for Deployment**:

> [!IMPORTANT]
> **Adgangspolitik:** Siden er en del af Hostrup Hub's interne infrastruktur. Derfor skal adgangen til `/dashboard/stocks` og tilhørende API'er være beskyttet med **`two_factor`** (Tofaktor-godkendelse via Authelia). 
> 
> *Konfiguration i Authelia `configuration.yml`:*
> ```yaml
> - domain: wish.hostrup.org
>   resources:
>     - "^/dashboard/stocks.*"
>     - "^/api/stocks.*"
>   policy: two_factor
> ```

---

## 🗺️ 7. Udviklingsplan (Sprints)

Implementeringen opdeles i fire overskuelige sprints, der kan eksekveres atomart:

### 🏁 Sprint 9.1: Database og Dataindhentning (Backend)
*   [ ] Opret Prisma migration med de fire nye tabeller (`Stock`, `StockTransaction`, `StockPriceDaily`, `ExchangeRateDaily`).
*   [ ] Etabler test-seed-data: Indlæs de 4 købte aktier (NVDA, AVGO, GOOGL, PLTR) med de præcise transaktionsdata fra **4. juni 2026** (inklusive gebyrer).
*   [ ] Opsæt integrationen til Yahoo Finance API og Frankfurter API.
*   [ ] Opret en SvelteKit server action eller cron-endpoint til at køre prissynkronisering.

### 🎨 Sprint 9.2: Hovedside & Visuelt Design (Frontend)
*   [ ] Opret ruten `src/routes/dashboard/stocks/`.
*   [ ] Implementer glassmorphism-kort til KPI'er (Værdi, Afkast, Kostpris, Valuta) samt den visuelle performance-bar.
*   [ ] Implementer porteføljetabellen med statusindikatorer for investeringsteser.
*   [ ] Opret cirkeldiagram (allokering) og historisk linjegraf ved brug af ApexCharts (CSS-variabel integration).

### ➕ Sprint 9.3: CRUD-Transaktionshåndtering
*   [ ] Design en modalformular til at tilføje nye transaktioner (Køb/Salg) med felter til: Dato, Ticker, Antal, Kurs (USD), Valutakurs (USD/DKK), Kurtage (DKK), Valutaveksling (DKK).
*   [ ] Implementer validering, så man ikke kan sælge flere aktier, end man ejer.
*   [ ] Udregn automatisk gennemsnitlig anskaffelsespris (Average Cost Basis) ved efterfølgende køb.

### 🎛️ Sprint 9.4: Simulators & Joker-Duel
*   [ ] Byg den interaktive 5-års scenarie-simulator med reactive sliders (EPS CAGR og Terminal P/E) og dynamisk, forklarende tekst.
*   [ ] Byg Joker-Duel tracking komponenten mellem Palantir (PLTR) og Astera Labs (ALAB).
*   [ ] Kør endelig testsuite: `npm run lint && npm run build` for at sikre zero type-fejl.
*   [ ] Udrul via standard deploy-flow: `./deploy.sh "Add stock portfolio monitoring page"`.
