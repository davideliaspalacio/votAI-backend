import { MatchScoringService, UserAnswer } from './match-scoring.service';

describe('MatchScoringService', () => {
  let service: MatchScoringService;

  beforeEach(() => {
    service = new MatchScoringService();
  });

  const makeAnswers = (
    values: { axis: string; value: number; weight: number }[],
  ): UserAnswer[] =>
    values.map((v, i) => ({
      questionId: `q${i + 1}`,
      ...v,
    }));

  const makePositions = (
    candidates: Record<string, Record<string, number>>,
  ): Map<string, Map<string, number>> => {
    const result = new Map<string, Map<string, number>>();
    for (const [id, axes] of Object.entries(candidates)) {
      result.set(id, new Map(Object.entries(axes)));
    }
    return result;
  };

  it('debe retornar score 100 cuando el usuario coincide exactamente con un candidato', () => {
    const answers = makeAnswers([
      { axis: 'economia', value: 3, weight: 2 },
      { axis: 'salud', value: 5, weight: 2 },
    ]);
    const positions = makePositions({
      c1: { economia: 3, salud: 5 },
    });

    const result = service.calculate(answers, positions);

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
    expect(result[0].rank).toBe(1);
  });

  it('debe retornar score 0 cuando el usuario es opuesto en todo', () => {
    const answers = makeAnswers([
      { axis: 'economia', value: 1, weight: 2 },
      { axis: 'salud', value: 1, weight: 2 },
    ]);
    const positions = makePositions({
      c1: { economia: 5, salud: 5 },
    });

    const result = service.calculate(answers, positions);

    expect(result[0].score).toBe(0);
  });

  it('debe ordenar candidatos por score descendente y asignar ranking correcto', () => {
    const answers = makeAnswers([
      { axis: 'economia', value: 1, weight: 2 },
      { axis: 'salud', value: 1, weight: 2 },
    ]);
    const positions = makePositions({
      c1: { economia: 1, salud: 1 }, // Coincidencia perfecta
      c2: { economia: 3, salud: 3 }, // Afinidad parcial
      c3: { economia: 5, salud: 5 }, // Opuesto
    });

    const result = service.calculate(answers, positions);

    expect(result[0].candidateId).toBe('c1');
    expect(result[0].rank).toBe(1);
    expect(result[0].score).toBe(100);

    expect(result[1].candidateId).toBe('c2');
    expect(result[1].rank).toBe(2);
    expect(result[1].score).toBe(50);

    expect(result[2].candidateId).toBe('c3');
    expect(result[2].rank).toBe(3);
    expect(result[2].score).toBe(0);
  });

  it('debe ponderar correctamente las respuestas por peso', () => {
    // Candidato coincide en economia (peso 3) pero difiere en salud (peso 1)
    const answers = makeAnswers([
      { axis: 'economia', value: 3, weight: 3 },
      { axis: 'salud', value: 1, weight: 1 },
    ]);
    const positions = makePositions({
      cA: { economia: 3, salud: 5 }, // Coincide en eje pesado
      cB: { economia: 5, salud: 1 }, // Coincide en eje ligero
    });

    const result = service.calculate(answers, positions);

    // cA: eco=3vs3→dist=0→sim=1→w=3, sal=1vs5→dist=4→sim=0→w=0 => total=3/4=75%
    // cB: eco=3vs5→dist=2→sim=0.5→w=1.5, sal=1vs1→dist=0→sim=1→w=1 => total=2.5/4=63%
    expect(result[0].candidateId).toBe('cA');
    expect(result[0].score).toBe(75);
    expect(result[1].candidateId).toBe('cB');
    expect(result[1].score).toBe(63);
  });

  it('debe manejar correctamente todos los pesos iguales a 1', () => {
    const answers = makeAnswers([
      { axis: 'economia', value: 2, weight: 1 },
      { axis: 'salud', value: 4, weight: 1 },
    ]);
    const positions = makePositions({
      c1: { economia: 2, salud: 4 },
    });

    const result = service.calculate(answers, positions);
    expect(result[0].score).toBe(100);
  });

  it('debe manejar correctamente todos los pesos iguales a 3', () => {
    const answers = makeAnswers([
      { axis: 'economia', value: 2, weight: 3 },
      { axis: 'salud', value: 4, weight: 3 },
    ]);
    const positions = makePositions({
      c1: { economia: 2, salud: 4 },
    });

    const result = service.calculate(answers, positions);
    expect(result[0].score).toBe(100);
  });

  it('debe calcular correctamente un escenario verificado a mano', () => {
    // Escenario con 3 ejes y 2 candidatos
    const answers = makeAnswers([
      { axis: 'economia', value: 2, weight: 3 },
      { axis: 'salud', value: 4, weight: 1 },
      { axis: 'seguridad', value: 3, weight: 2 },
    ]);
    const positions = makePositions({
      c1: { economia: 4, salud: 3, seguridad: 3 },
      c2: { economia: 2, salud: 5, seguridad: 1 },
    });

    const result = service.calculate(answers, positions);

    // c1:
    //   eco: |2-4|=2, sim=0.5, w=0.5*3=1.5
    //   sal: |4-3|=1, sim=0.75, w=0.75*1=0.75
    //   seg: |3-3|=0, sim=1.0, w=1.0*2=2.0
    //   total=4.25, max=6 → score=round(4.25/6*100)=71
    expect(result.find((s) => s.candidateId === 'c1')!.score).toBe(71);

    // c2:
    //   eco: |2-2|=0, sim=1.0, w=1.0*3=3.0
    //   sal: |4-5|=1, sim=0.75, w=0.75*1=0.75
    //   seg: |3-1|=2, sim=0.5, w=0.5*2=1.0
    //   total=4.75, max=6 → score=round(4.75/6*100)=79
    expect(result.find((s) => s.candidateId === 'c2')!.score).toBe(79);

    // c2 debe estar primero
    expect(result[0].candidateId).toBe('c2');
    expect(result[0].rank).toBe(1);
  });

  it('debe retornar axisDistances correctos', () => {
    const answers = makeAnswers([{ axis: 'economia', value: 1, weight: 2 }]);
    const positions = makePositions({ c1: { economia: 3 } });

    const result = service.calculate(answers, positions);

    expect(result[0].axisDistances).toHaveLength(1);
    expect(result[0].axisDistances[0].axis).toBe('economia');
    expect(result[0].axisDistances[0].distance).toBe(2);
    expect(result[0].axisDistances[0].similarity).toBe(0.5);
  });

  it('debe ignorar ejes donde el candidato no tiene posición', () => {
    const answers = makeAnswers([
      { axis: 'economia', value: 3, weight: 2 },
      { axis: 'salud', value: 3, weight: 2 },
    ]);
    // c1 solo tiene economia
    const positions = makePositions({ c1: { economia: 3 } });

    const result = service.calculate(answers, positions);

    // Solo se evalúa economía: coincidencia perfecta → 100%
    expect(result[0].score).toBe(100);
    expect(result[0].axisDistances).toHaveLength(1);
  });

  it('debe manejar una lista vacía de candidatos', () => {
    const answers = makeAnswers([{ axis: 'economia', value: 3, weight: 2 }]);
    const positions = makePositions({});

    const result = service.calculate(answers, positions);
    expect(result).toHaveLength(0);
  });

  it('debe funcionar con los 10 ejes completos', () => {
    const axes = [
      'economia', 'salud', 'educacion', 'seguridad', 'ambiente',
      'politica_social', 'politica_exterior', 'reforma_politica', 'empleo', 'tecnologia',
    ];
    const answers = makeAnswers(
      axes.map((axis) => ({ axis, value: 3, weight: 2 })),
    );
    const positions = makePositions({
      c1: Object.fromEntries(axes.map((a) => [a, 3])),
    });

    const result = service.calculate(answers, positions);
    expect(result[0].score).toBe(100);
    expect(result[0].axisDistances).toHaveLength(10);
  });
});
