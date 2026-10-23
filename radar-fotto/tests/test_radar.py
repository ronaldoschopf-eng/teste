import unittest
from datetime import date

from radar import fotto, geo


class FakeResp:
    def __init__(self, url, texto):
        self.url, self.texto, self.status = url, texto, 200

    @property
    def ok(self):
        return True


class FakeHttp:
    def __init__(self, paginas):
        self.paginas = paginas

    def get(self, url, **_):
        t = self.paginas.get(url)
        return FakeResp(url, t) if t is not None else None


class TestGeo(unittest.TestCase):
    def test_raio(self):
        self.assertEqual(geo.distancia_centro("Santa Maria")[0], 0.0)
        self.assertLess(geo.distancia_centro("Formigueiro")[0], 100)
        self.assertLess(geo.distancia_centro("Cachoeira do Sul")[0], 100)
        self.assertGreater(geo.distancia_centro("Santiago")[0], 100)
        self.assertIsNone(geo.distancia_centro("Cidade Inexistente")[0])


class TestCasamento(unittest.TestCase):
    def test_edicao_diferente_nao_casa(self):
        self.assertEqual(fotto.similaridade("4ª Rústica da Medianeira", "2ª RÚSTICA DA MEDIANEIRA - FACIAL"), 0)

    def test_variante_casa(self):
        self.assertGreater(fotto.similaridade("4ª Rústica da Medianeira", "4 RUSTICA DA MEDIANEIRA - REC FACIAL"), 0.55)


class TestClassificacao(unittest.TestCase):
    def _ev(self):
        return {"nome": "Corrida da Asa Santa Maria", "variantes": [], "data": "2026-10-11"}

    def test_fotos_publicadas(self):
        alb = "https://x.fotto.com.br/corrida-da-asa-santa-maria/e/1"
        http = FakeHttp({alb: "<title>Corrida</title> realizado em Santa Maria, RS no dia 11/10/2026 2.345 fotos"})
        r = fotto.verificar_evento(http, self._ev(), [{"id": "1", "url": alb, "titulo": "CORRIDA DA ASA SANTA MARIA", "perfil": "p"}], ["p"], [])
        self.assertEqual(r["classe"], "A")

    def test_outra_edicao_ignorada_e_cobertura_parcial_vira_D(self):
        alb = "https://x.fotto.com.br/corrida-da-asa/e/2"
        http = FakeHttp({alb: "Salvador no dia 13/10/2024 9.605 fotos"})
        r = fotto.verificar_evento(http, self._ev(), [{"id": "2", "url": alb, "titulo": "CORRIDA DA ASA SANTA MARIA", "perfil": "p"}], ["p"], [])
        self.assertEqual(r["classe"], "D")  # sem busca interna configurada não é C

    def test_em_breve(self):
        self.assertEqual(fotto.classificar([{"fotos": None, "em_breve": True, "url": "u"}], True)[0], "B")

    def test_sem_resultado_com_cobertura_completa(self):
        self.assertEqual(fotto.classificar([], True)[0], "C")


if __name__ == "__main__":
    unittest.main()
