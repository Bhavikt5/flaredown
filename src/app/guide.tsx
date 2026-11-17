import { View } from 'react-native';
import { EVIDENCE_LABEL, FOOD_GUIDE, Risk, RISK_LABEL } from '@/data/foodGuide';
import { C, Card, H2, P, Pill, Screen } from '@/components/ui';

const COLORS: Record<Risk, [string, string]> = {
  higher: [C.flare, C.flareSoft],
  watch: [C.warn, C.warnSoft],
  neutral: [C.muted, C.bg],
  supportive: [C.good, C.goodSoft],
};

export default function Guide() {
  return (
    <Screen>
      <P muted>
        General guidance from published research. Triggers differ from person to person, so your own Insights matter more.
        Ratings in this prototype still need review by a dermatologist or nutritionist.
      </P>
      {FOOD_GUIDE.map((g) => (
        <Card key={g.key}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Pill text={RISK_LABEL[g.risk]} color={COLORS[g.risk][0]} bg={COLORS[g.risk][1]} />
            <Pill text={EVIDENCE_LABEL[g.evidence]} color={C.muted} bg={C.bg} />
          </View>
          <H2>{g.title}</H2>
          <P>{g.note}</P>
        </Card>
      ))}
    </Screen>
  );
}
