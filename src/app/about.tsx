import { C, Card, H2, P, Screen } from '@/components/ui';

export default function About() {
  return (
    <Screen>
      <Card>
        <H2>How trigger detection works</H2>
        <P>
          A day counts as a flare if you mark it, or if your skin rating is 2 or more points above your average of the
          previous 14 days.
        </P>
        <P>
          For each food group, ingredient, alcohol, short sleep, high stress, dry air and cold nights, the app compares how
          often flares happened 1 to 3, 4 to 7 and 8 to 14 days after it versus without it.
        </P>
        <P>
          A link is shown only after 21 check-in days, at least 3 flare days, and when the thing was seen on 4 or more
          days. Confidence (Low, Medium, High) reflects how unlikely the pattern is to be chance.
        </P>
        <P muted>Missing food logs are not counted as “didn’t eat it”, so gaps don’t create false links.</P>
      </Card>

      <Card>
        <H2>Getting good results</H2>
        <P>Log every day, even good days. Clear days are as important as flare days.</P>
        <P>Log all meals including snacks and chai. Use favourites to make it fast.</P>
        <P>To confirm a suspected trigger, avoid it for 3 weeks, then add it back.</P>
      </Card>

      <Card style={{ backgroundColor: C.warnSoft, borderColor: C.warnSoft }}>
        <H2>Safety</H2>
        <P>This app is for personal tracking only. It does not diagnose or treat any condition.</P>
        <P>Never stop or change prescribed medicine without your dermatologist.</P>
        <P>Don’t cut out many foods at once; talk to a doctor or nutritionist first.</P>
        <P>
          Get medical help quickly for a sudden widespread flare, fever with skin changes, pus-filled spots, or swollen
          painful joints.
        </P>
      </Card>

      <Card>
        <H2>Privacy</H2>
        <P>
          All data is stored only on this phone. Weather lookups send a rounded location (about 10 km) to Open-Meteo. No
          account, no analytics, no ads.
        </P>
      </Card>
    </Screen>
  );
}
