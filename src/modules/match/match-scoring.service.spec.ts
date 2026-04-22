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
      { axis: 'salud', value: 7, weight: 2 },
    ]);
    const positions = makePositions({
      c1: { economia: 3, salud: 7 },
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
      c1: { economia: 7, salud: 7 },
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
      c2: { economia: 4, salud: 4 }, // Afinidad parcial (distancia 3, sim=0.5)
      c3: { economia: 7, salud: 7 }, // Opuesto
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
    const answers = makeAnswers([
      { axis: 'economia', value: 4, weight: 3 },
      { axis: 'salud', value: 1, weight: 1 },
    ]);
    const positions = makePositions({
      cA: { economia: 4, salud: 7 }, // Coincide en eje pesado
      cB: { economia: 7, salud: 1 }, // Coincide en eje ligero
    });

    const result = service.calculate(answers, positions);

    // cA: eco=4vs4→dist=0→sim=1→w=3, sal=1vs7→dist=6→sim=0→w=0 => total=3/4=75%
    // cB: eco=4vs7→dist=3→sim=0.5→w=1.5, sal=1vs1→dist=0→sim=1→w=1 => total=2.5/4=63%
    expect(result[0].candidateId).toBe('cA');
    expect(result[0].score).toBe(75);
    expect(result[1].candidateId).toBe('cB');
    expect(result[1].score).toBe(63);
  });

  it('debe manejar correctamente todos los pesos iguales a 1', () => {
    const answers = makeAnswers([
      { axis: 'economia', value: 2, weight: 1 },
      { axis: 'salud', value: 5, weight: 1 },
    ]);
    const positions = makePositions({
      c1: { economia: 2, salud: 5 },
    });

    const result = service.calculate(answers, positions);
    expect(result[0].score).toBe(100);
  });

  it('debe manejar correctamente todos los pesos iguales a 3', () => {
    const answers = makeAnswers([
      { axis: 'economia', value: 3, weight: 3 },
      { axis: 'salud', value: 6, weight: 3 },
    ]);
    const positions = makePositions({
      c1: { economia: 3, salud: 6 },
    });

    const result = service.calculate(answers, positions);
    expect(result[0].score).toBe(100);
  });

  it('debe calcular correctamente un escenario verificado a mano', () => {
    const answers = makeAnswers([
      { axis: 'economia', value: 2, weight: 3 },
      { axis: 'salud', value: 5, weight: 1 },
      { axis: 'seguridad', value: 4, weight: 2 },
    ]);
    const positions = makePositions({
      c1: { economia: 5, salud: 4, seguridad: 4 },
      c2: { economia: 2, salud: 7, seguridad: 1 },
    });

    const result = service.calculate(answers, positions);

    // c1:
    //   eco: |2-5|=3, sim=1-3/6=0.5, w=0.5*3=1.5
    //   sal: |5-4|=1, sim=1-1/6=0.833, w=0.833*1=0.833
    //   seg: |4-4|=0, sim=1.0, w=1.0*2=2.0
    //   total=4.333, max=6 → score=round(4.333/6*100)=72
    expect(result.find((s) => s.candidateId === 'c1')!.score).toBe(72);

    // c2:
    //   eco: |2-2|=0, sim=1.0, w=1.0*3=3.0
    //   sal: |5-7|=2, sim=1-2/6=0.667, w=0.667*1=0.667
    //   seg: |4-1|=3, sim=1-3/6=0.5, w=0.5*2=1.0
    //   total=4.667, max=6 → score=round(4.667/6*100)=78
    expect(result.find((s) => s.candidateId === 'c2')!.score).toBe(78);

    expect(result[0].candidateId).toBe('c2');
    expect(result[0].rank).toBe(1);
  });

  it('debe retornar axisDistances correctos', () => {
    const answers = makeAnswers([{ axis: 'economia', value: 1, weight: 2 }]);
    const positions = makePositions({ c1: { economia: 4 } });

    const result = service.calculate(answers, positions);

    expect(result[0].axisDistances).toHaveLength(1);
    expect(result[0].axisDistances[0].axis).toBe('economia');
    expect(result[0].axisDistances[0].distance).toBe(3);
    expect(result[0].axisDistances[0].similarity).toBe(0.5);
  });

  it('debe ignorar ejes donde el candidato no tiene posición', () => {
    const answers = makeAnswers([
      { axis: 'economia', value: 4, weight: 2 },
      { axis: 'salud', value: 4, weight: 2 },
    ]);
    const positions = makePositions({ c1: { economia: 4 } });

    const result = service.calculate(answers, positions);

    expect(result[0].score).toBe(100);
    expect(result[0].axisDistances).toHaveLength(1);
  });

  it('debe manejar una lista vacía de candidatos', () => {
    const answers = makeAnswers([{ axis: 'economia', value: 4, weight: 2 }]);
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
      axes.map((axis) => ({ axis, value: 4, weight: 2 })),
    );
    const positions = makePositions({
      c1: Object.fromEntries(axes.map((a) => [a, 4])),
    });

    const result = service.calculate(answers, positions);
    expect(result[0].score).toBe(100);
    expect(result[0].axisDistances).toHaveLength(10);
  });

  it('debe diferenciar correctamente entre 7 candidatos', () => {
    const answers = makeAnswers([
      { axis: 'economia', value: 4, weight: 2 },
    ]);
    const positions = makePositions({
      c1: { economia: 1 },
      c2: { economia: 2 },
      c3: { economia: 3 },
      c4: { economia: 4 }, // Coincidencia perfecta
      c5: { economia: 5 },
      c6: { economia: 6 },
      c7: { economia: 7 },
    });

    const result = service.calculate(answers, positions);

    expect(result[0].candidateId).toBe('c4');
    expect(result[0].score).toBe(100);
    // Deben tener scores distintos (pueden coincidir por simetria al redondear)
    const scores = result.map((r) => r.score);
    expect(new Set(scores).size).toBeGreaterThanOrEqual(4);
  });
});
