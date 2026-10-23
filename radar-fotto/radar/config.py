"""Configuração central do radar."""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DIR_DADOS = RAIZ / "data"
DIR_SAIDA = RAIZ / "saida"
DIR_CACHE = RAIZ / "cache"
DIR_LOGS = RAIZ / "logs"
DIR_INSPECAO = RAIZ / "inspecao"

# Centro: sede municipal de Santa Maria/RS (aprox.)
CENTRO_NOME = "Santa Maria/RS"
CENTRO_LAT = -29.6842
CENTRO_LON = -53.8069
RAIO_KM = 100.0

FUSO = "America/Sao_Paulo"

# Coleta educada
USER_AGENT = (
    "RadarFotografico/0.1 (pesquisa de eventos publicos; "
    "contato: defina RADAR_CONTATO no ambiente)"
)
INTERVALO_MIN_POR_HOST_S = 3.0   # pausa mínima entre requisições ao mesmo host
MAX_CONCORRENCIA = 2             # requisições simultâneas no total
TIMEOUT_S = 20
TENTATIVAS = 3
CACHE_TTL_HORAS = 12

# Páginas iniciais da Fotto (públicas). Não representam todos os fotógrafos.
FOTTO_BASE = "https://www.fotto.com.br"
FOTTO_PERFIS = [
    "https://gkfotografiaesportiva.fotto.com.br/",
    "https://igbfotos.fotto.com.br/",
    "https://clicknafotto.fotto.com.br/",
    "https://minhafotoemjogo.fotto.com.br/",
    # Perfis com eventos da região encontrados em buscas indexadas (23/10/2026):
    "https://silvio-kaufmann.fotto.com.br/",
    "https://fotomix.fotto.com.br/",
    "https://www.fotto.com.br/andersonfotos",
]
# URL de busca da Fotto: preencher depois de rodar `inspecionar`.
# Use "{q}" onde entra o termo. Deixe None enquanto não for confirmada.
FOTTO_URL_BUSCA = None

# Coordenadas aproximadas das sedes municipais (lat, lon).
# Para precisão maior use `python -m radar geocodificar` (Nominatim/OSM).
CIDADES = {
    "Santa Maria": (-29.6842, -53.8069),
    "Itaara": (-29.6013, -53.7725),
    "Silveira Martins": (-29.6467, -53.5910),
    "São Pedro do Sul": (-29.6206, -54.1855),
    "Dilermando de Aguiar": (-29.7054, -54.2122),
    "Restinga Sêca": (-29.8130, -53.3807),
    "Ivorá": (-29.5232, -53.5842),
    "Faxinal do Soturno": (-29.5787, -53.4484),
    "Nova Palma": (-29.4710, -53.4689),
    "Dona Francisca": (-29.6195, -53.3617),
    "Agudo": (-29.6447, -53.2515),
    "Paraíso do Sul": (-29.6717, -53.1440),
    "Formigueiro": (-30.0036, -53.4959),
    "São Sepé": (-30.1606, -53.5650),
    "Vila Nova do Sul": (-30.3461, -53.8761),
    "Júlio de Castilhos": (-29.2269, -53.6818),
    "Tupanciretã": (-29.0806, -53.8358),
    "Mata": (-29.5649, -54.4641),
    "São Vicente do Sul": (-29.6882, -54.6826),
    "Jaguari": (-29.4972, -54.6903),
    "Cachoeira do Sul": (-30.0392, -52.8939),
    "Caçapava do Sul": (-30.5144, -53.4827),
    "São Gabriel": (-30.3337, -54.3217),
    "Santiago": (-29.1897, -54.8666),
    "Cruz Alta": (-28.6386, -53.6064),
    "Santa Cruz do Sul": (-29.7184, -52.4253),
    "Rosário do Sul": (-30.2515, -54.9221),
}
