export function PrivacyTab() {
  return (
    <div className="space-y-5 text-[13px] text-[var(--color-ink-900)] max-w-xl">
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold text-[var(--color-marine-800)]">
          Datenschutz &amp; Transparenz
        </h3>
        <p className="text-[var(--color-ink-500)]">
          Informationen zur Datenverarbeitung bei aktivierter IServ-Anmeldung.
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Verarbeitete Daten</h4>
        <p>
          Bei aktivierter IServ-Anmeldung werden folgende Daten verarbeitet: IServ-Kennung
          (<code className="text-[12px] font-mono bg-[var(--color-paper-bg)] px-1 rounded">sub</code>),
          Anzeigename und freigegebene Gruppen — sowie die Plandaten des Schuljahres.
        </p>
        <p>
          Das App-Token wird im{' '}
          <code className="text-[12px] font-mono bg-[var(--color-paper-bg)] px-1 rounded">sessionStorage</code>{' '}
          des Browsers gespeichert — nicht in{' '}
          <code className="text-[12px] font-mono bg-[var(--color-paper-bg)] px-1 rounded">localStorage</code>{' '}
          oder Cookies. Es wird beim Schließen des Browser-Tabs automatisch gelöscht.
          IServ-Zugangsdaten werden nicht gespeichert.
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Speicherorte</h4>
        <p>
          Plandaten werden auf dem WordPress-Server (Hoster w3w.de, DE/EU) gespeichert.
        </p>
        <p>
          Die Planner-Oberfläche wird von <strong>GitHub Pages</strong> (GitHub/Microsoft, USA)
          geladen; dabei wird die IP-Adresse in ein Drittland übertragen. Dort werden{' '}
          <em>keine</em> Plandaten verarbeitet (nur statisches JavaScript/CSS). Zweck:
          gemeinsame Terminplanung. Rechtsgrundlage und Ansprechpartner: siehe schulisches
          Datenschutzkonzept.
        </p>
      </div>

      <div
        className="p-4 rounded-[var(--radius-default)] space-y-1"
        style={{
          borderLeft: '4px solid var(--color-marine-800)',
          background: 'var(--color-paper-bg)',
        }}
      >
        <p className="font-semibold">Hinweis („Vibecoding")</p>
        <p className="text-[var(--color-ink-700)]">
          Diese Werkzeuge (Planner und WordPress-Plugin) wurden im Wege des „Vibecodings" —
          also KI-gestützter Softwareentwicklung — erstellt. Vor dem produktiven Einsatz
          mit personenbezogenen Daten sind die übliche Sorgfalt, Tests und eine
          datenschutzrechtliche Bewertung anzuwenden.
        </p>
      </div>
    </div>
  );
}
