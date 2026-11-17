import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Linking,
  Vibration,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANCOS_BRASIL = [
  { nome: 'Nubank', cor: '#820AD1' },
  { nome: 'Itaú', cor: '#EC7000' },
  { nome: 'Caixa Econômica', cor: '#005CA9' },
  { nome: 'Bradesco', cor: '#CC092F' },
  { nome: 'Banco do Brasil', cor: '#FFF100', corTexto: '#003366' },
  { nome: 'Santander', cor: '#EC0000' },
  { nome: 'Inter', cor: '#FF7A00' },
  { nome: 'C6 Bank', cor: '#242424' },
  { nome: 'PicPay', cor: '#11C76F' },
  { nome: 'Outro / Dinheiro / Pix', cor: '#8E8E93' },
];

const MESES = [
  { id: '01', nome: 'Janeiro' },
  { id: '02', nome: 'Fevereiro' },
  { id: '03', nome: 'Março' },
  { id: '04', nome: 'Abril' },
  { id: '05', nome: 'Maio' },
  { id: '06', nome: 'Junho' },
  { id: '07', nome: 'Julho' },
  { id: '08', nome: 'Agosto' },
  { id: '09', nome: 'Setembro' },
  { id: '10', nome: 'Outubro' },
  { id: '11', nome: 'Novembro' },
  { id: '12', nome: 'Dezembro' },
];

const tocarSom = (tipo) => {
  try {
    let caminho = '';
    if (tipo === 'dinheiro') {
      caminho = '/sounds/dinheiro.mp3';
    } else if (tipo === 'alerta') {
      caminho = '/sounds/alerta.mp3';
    }

    if (caminho) {
      const som = new Audio(caminho);
      som.play().catch(e => console.log('Áudio aguardando interação do usuário', e));
    }
  } catch (error) {
    console.log('Erro ao tocar áudio:', error);
  }
};

export default function App() {
  const mesAtualStr = String(new Date().getMonth() + 1).padStart(2, '0');
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualStr);
  const [modalMesVisible, setModalMesVisible] = useState(false);
  const [modalAnualVisible, setModalAnualVisible] = useState(false);

  const [renda, setRenda] = useState('');
  const [rendaExtraDesc, setRendaExtraDesc] = useState('');
  const [rendaExtraValor, setRendaExtraValor] = useState('');
  const [listaRendasExtras, setListaRendasExtras] = useState([]);

  const [nomeMeta, setNomeMeta] = useState('');
  const [valorMeta, setValorMeta] = useState('');
  const [mesesMeta, setMesesMeta] = useState('12');

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('fixa');
  const [bancoSelecionado, setBancoSelecionado] = useState('Nubank');
  const [modalBancoVisible, setModalBancoVisible] = useState(false);

  const [transacoes, setTransacoes] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [editandoId, setEditandoId] = useState(null);

  const jaTocouAlertaRef = useRef(false);
  const metaAtingidaAnteriorRef = useRef(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const salvarDadosNoDispositivo = async (novasTransacoes, novasRendas, novaRendaFixa, metaNome, metaValor, metaMeses) => {
    try {
      await AsyncStorage.setItem('@transacoes', JSON.stringify(novasTransacoes));
      await AsyncStorage.setItem('@rendasExtras', JSON.stringify(novasRendas));
      await AsyncStorage.setItem('@rendaFixa', novaRendaFixa);
      await AsyncStorage.setItem('@metaNome', metaNome);
      await AsyncStorage.setItem('@metaValor', metaValor);
      await AsyncStorage.setItem('@metaMeses', metaMeses);
    } catch (e) {
      console.log('Erro ao salvar', e);
    }
  };

  const carregarDados = async () => {
    try {
      const t = await AsyncStorage.getItem('@transacoes');
      const r = await AsyncStorage.getItem('@rendasExtras');
      const rf = await AsyncStorage.getItem('@rendaFixa');
      const mn = await AsyncStorage.getItem('@metaNome');
      const mv = await AsyncStorage.getItem('@metaValor');
      const mm = await AsyncStorage.getItem('@metaMeses');

      if (t) setTransacoes(JSON.parse(t));
      if (r) setListaRendasExtras(JSON.parse(r));
      if (rf) setRenda(rf);
      if (mn) setNomeMeta(mn);
      if (mv) setValorMeta(mv);
      if (mm) setMesesMeta(mm);
    } catch (e) {
      console.log('Erro ao carregar', e);
    }
  };

  const formatarNumeroInput = (texto) => {
    return texto.replace(',', '.');
  };

  const adicionarRendaExtra = () => {
    if (!rendaExtraDesc || !rendaExtraValor) return;
    Vibration.vibrate([0, 50, 50, 50]);
    tocarSom('dinheiro');

    const valorNumerico = parseFloat(formatarNumeroInput(rendaExtraValor)) || 0;
    const novaRenda = {
      id: Date.now().toString(),
      descricao: rendaExtraDesc,
      valor: valorNumerico,
      mes: mesSelecionado,
    };
    const atualizadas = [...listaRendasExtras, novaRenda];
    setListaRendasExtras(atualizadas);
    setRendaExtraDesc('');
    setRendaExtraValor('');
    salvarDadosNoDispositivo(transacoes, atualizadas, renda, nomeMeta, valorMeta, mesesMeta);
  };

  const removerRendaExtra = (id) => {
    const atualizadas = listaRendasExtras.filter((r) => r.id !== id);
    setListaRendasExtras(atualizadas);
    salvarDadosNoDispositivo(transacoes, atualizadas, renda, nomeMeta, valorMeta, mesesMeta);
  };

  const salvarTransacao = () => {
    if (!descricao || !valor) return;

    const valorNumerico = parseFloat(formatarNumeroInput(valor)) || 0;

    let novasTransacoes;
    if (editandoId) {
      novasTransacoes = transacoes.map((t) =>
        t.id === editandoId
          ? { ...t, descricao, valor: valorNumerico, tipo, banco: bancoSelecionado, mes: mesSelecionado }
          : t
      );
      setEditandoId(null);
    } else {
      const nova = {
        id: Date.now().toString(),
        descricao,
        valor: valorNumerico,
        tipo,
        banco: bancoSelecionado,
        mes: mesSelecionado,
      };
      novasTransacoes = [nova, ...transacoes];
    }

    setTransacoes(novasTransacoes);
    setDescricao('');
    setValor('');
    setTipo('fixa');
    salvarDadosNoDispositivo(novasTransacoes, listaRendasExtras, renda, nomeMeta, valorMeta, mesesMeta);
  };

  const prepararEdicao = (item) => {
    setDescricao(item.descricao);
    setValor(item.valor.toString().replace('.', ','));
    setTipo(item.tipo);
    if (item.banco) setBancoSelecionado(item.banco);
    if (item.mes) setMesSelecionado(item.mes);
    setEditandoId(item.id);
  };

  const removerTransacao = (id) => {
    const novasTransacoes = transacoes.filter((t) => t.id !== id);
    setTransacoes(novasTransacoes);
    if (editandoId === id) {
      setEditandoId(null);
      setDescricao('');
      setValor('');
    }
    salvarDadosNoDispositivo(novasTransacoes, listaRendasExtras, renda, nomeMeta, valorMeta, mesesMeta);
  };

  const limparTudo = () => {
    Alert.alert(
      'Zerar Planilha',
      'Tem a certeza que deseja apagar todos os lançamentos deste mês?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, zerar',
          style: 'destructive',
          onPress: () => {
            const novasTransacoes = transacoes.filter((t) => t.mes !== mesSelecionado);
            const novasRendasExtras = listaRendasExtras.filter((r) => !r.mes || r.mes !== mesSelecionado);
            setTransacoes(novasTransacoes);
            setListaRendasExtras(novasRendasExtras);
            setEditandoId(null);
            setDescricao('');
            setValor('');
            salvarDadosNoDispositivo(novasTransacoes, novasRendasExtras, renda, nomeMeta, valorMeta, mesesMeta);
          },
        },
      ]
    );
  };

  const compartilharWhatsApp = async () => {
    const nomeMesAtual = MESES.find(m => m.id === mesSelecionado)?.nome || '';
    const mensagem = 
      'Jonatha Planilha de Gastos (' + nomeMesAtual + ')\n\n' +
      'Renda Total: R$ ' + rendaTotalGeral.toFixed(2) + '\n' +
      'Total de Gastos: R$ ' + totalGasto.toFixed(2) + '\n' +
      'Saldo Livre: R$ ' + saldoRestante.toFixed(2) + '\n\n' +
      'Organizado com Gestão Financeira Inteligente!';

    const url = 'https://wa.me/?text=' + encodeURIComponent(mensagem);

    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    }
  };

  const rendaFixaNumerica = parseFloat(formatarNumeroInput(renda)) || 0;
  
  const rendasExtrasDoMes = listaRendasExtras.filter((r) => !r.mes || r.mes === mesSelecionado);
  const totalRendaExtra = rendasExtrasDoMes.reduce((acc, r) => acc + r.valor, 0);
  const rendaTotalGeral = rendaFixaNumerica + totalRendaExtra;

  const transacoesDoMes = transacoes.filter((t) => !t.mes || t.mes === mesSelecionado);

  const totalFixas = transacoesDoMes
    .filter((t) => t.tipo === 'fixa')
    .reduce((acc, t) => acc + t.valor, 0);

  const totalVariaveis = transacoesDoMes
    .filter((t) => t.tipo === 'variavel')
    .reduce((acc, t) => acc + t.valor, 0);

  const totalGasto = totalFixas + totalVariaveis;
  const saldoRestante = rendaTotalGeral - totalGasto;
  const ultrapassou = totalGasto > rendaTotalGeral && rendaTotalGeral > 0;

  let porcentagemGasta = rendaTotalGeral > 0 ? (totalGasto / rendaTotalGeral) * 100 : 0;
  if (porcentagemGasta > 100) porcentagemGasta = 100;

  const valorMetaNum = parseFloat(formatarNumeroInput(valorMeta)) || 0;
  const mesesMetaNum = parseInt(mesesMeta) || 12;
  const aporteMensalNecessario = valorMetaNum > 0 && mesesMetaNum > 0 ? valorMetaNum / mesesMetaNum : 0;
  const consegueAtingirMeta = valorMetaNum > 0 && rendaTotalGeral > 0 && saldoRestante >= aporteMensalNecessario;

  useEffect(() => {
    if (ultrapassou && !jaTocouAlertaRef.current) {
      Vibration.vibrate([0, 200, 100, 200, 100, 200]);
      tocarSom('alerta');
      jaTocouAlertaRef.current = true;
    } else if (!ultrapassou) {
      jaTocouAlertaRef.current = false;
    }
  }, [ultrapassou]);

  useEffect(() => {
    if (consegueAtingirMeta && !metaAtingidaAnteriorRef.current) {
      Vibration.vibrate([0, 100, 80, 100]);
      metaAtingidaAnteriorRef.current = true;
    } else if (!consegueAtingirMeta) {
      metaAtingidaAnteriorRef.current = false;
    }
  }, [consegueAtingirMeta]);

  const investimentoPossivelAtual = Math.max(saldoRestante * 0.50, 0);
  const mediaSugeridaDiaria = rendaTotalGeral > 0 ? (rendaTotalGeral - totalFixas - aporteMensalNecessario) / 30 : 0;

  const transacoesFiltradas = transacoesDoMes.filter((t) => {
    if (filtro === 'fixa') return t.tipo === 'fixa';
    if (filtro === 'variavel') return t.tipo === 'variavel';
    return true;
  });

  const nomeMesSelecionado = MESES.find(m => m.id === mesSelecionado)?.nome || 'Mês';

  // Cálculo para o Resumo Anual (Itaú Style)
  const calcularTotalMes = (idMes) => {
    const tMes = transacoes.filter((t) => t.mes === idMes);
    return tMes.reduce((acc, t) => acc + t.valor, 0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.titulo}>Jonatha Planilha de Gastos</Text>
        <Text style={styles.subtituloHeader}>Gestão Financeira Inteligente</Text>

        <View style={styles.linhaSeleitoresMes}>
          <TouchableOpacity style={[styles.cardSeletorMes, { flex: 1, marginRight: 6 }]} onPress={() => setModalMesVisible(true)}>
            <Text style={styles.txtRotuloMes}>📅 Mês:</Text>
            <Text style={styles.txtMesAtivo}>{nomeMesSelecionado} ▼</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botaoVisaoAnual} onPress={() => setModalAnualVisible(true)}>
            <Text style={styles.txtBotaoAnual}>📊 Resumo Anual</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardRenda}>
          <Text style={styles.labelCard}>Renda Mensal Fixa (Salário)</Text>
          <TextInput
            style={styles.inputRenda}
            placeholder="Ex: 3500,00"
            placeholderTextColor="#8E8E93"
            keyboardType="decimal-pad"
            value={renda}
            onChangeText={(txt) => {
              setRenda(txt);
              salvarDadosNoDispositivo(transacoes, listaRendasExtras, txt, nomeMeta, valorMeta, mesesMeta);
            }}
          />
        </View>

        <View style={styles.cardRendaExtra}>
          <Text style={styles.subtituloForm}>💰 Entrada Extra ({nomeMesSelecionado})</Text>
          <View style={styles.rowInput}>
            <TextInput
              style={[styles.input, { flex: 2, marginRight: 6 }]}
              placeholder="Ex: 13º Salário, PIS"
              placeholderTextColor="#8E8E93"
              value={rendaExtraDesc}
              onChangeText={setRendaExtraDesc}
            />
            <TextInput
              style={[styles.input, { flex: 1.2 }]}
              placeholder="Valor R$"
              placeholderTextColor="#8E8E93"
              keyboardType="decimal-pad"
              value={rendaExtraValor}
              onChangeText={setRendaExtraValor}
            />
          </View>
          <TouchableOpacity style={styles.btnRendaExtra} onPress={adicionarRendaExtra}>
            <Text style={styles.txtBtnRendaExtra}>+ Adicionar Renda Extra</Text>
          </TouchableOpacity>

          {rendasExtrasDoMes.length > 0 && (
            <View style={styles.boxListaExtra}>
              {rendasExtrasDoMes.map((item) => (
                <View key={item.id} style={styles.itemRendaExtra}>
                  <Text style={styles.txtItemExtra}>💵 {item.descricao}: +R$ {item.valor.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => removerRendaExtra(item.id)}>
                    <Text style={styles.txtDelExtra}>❌</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.cardMeta}>
          <Text style={styles.tituloMeta}>🎯 Minha Meta Financeira</Text>
          <TextInput
            style={styles.input}
            placeholder="Objetivo (Ex: Investir R$ 5.000, Viagem)"
            placeholderTextColor="#8E8E93"
            value={nomeMeta}
            onChangeText={(txt) => {
              setNomeMeta(txt);
              salvarDadosNoDispositivo(transacoes, listaRendasExtras, renda, txt, valorMeta, mesesMeta);
            }}
          />
          <View style={styles.rowInput}>
            <TextInput
              style={[styles.input, { flex: 2, marginRight: 6 }]}
              placeholder="Valor Total R$ (Ex: 5000,00)"
              placeholderTextColor="#8E8E93"
              keyboardType="decimal-pad"
              value={valorMeta}
              onChangeText={(txt) => {
                setValorMeta(txt);
                salvarDadosNoDispositivo(transacoes, listaRendasExtras, renda, nomeMeta, txt, mesesMeta);
              }}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Meses (Ex: 12)"
              placeholderTextColor="#8E8E93"
              keyboardType="numeric"
              value={mesesMeta}
              onChangeText={(txt) => {
                setMesesMeta(txt);
                salvarDadosNoDispositivo(transacoes, listaRendasExtras, renda, nomeMeta, valorMeta, txt);
              }}
            />
          </View>

          {valorMetaNum > 0 && (
            <View style={[styles.boxResultadoMeta, { borderLeftColor: consegueAtingirMeta ? '#34C759' : '#FF9500' }]}>
              <Text style={styles.txtResultadoMeta}>
                Para atingir <Text style={{fontWeight: 'bold'}}>{nomeMeta || 'sua meta'}</Text> em {mesesMetaNum} meses:
              </Text>
              <Text style={styles.txtAporteMeta}>
                Guarde <Text style={{fontSize: 17, color: '#007AFF', fontWeight: 'bold'}}>R$ {aporteMensalNecessario.toFixed(2)}</Text> por mês.
              </Text>

              {rendaTotalGeral > 0 && (
                <Text style={[styles.txtStatusMeta, { color: consegueAtingirMeta ? '#2E7D32' : '#C75000' }]}>
                  {consegueAtingirMeta
                    ? '✅ Seu saldo livre atual cobre esta meta perfeitamente!'
                    : '⚠️ Seu saldo livre atual está abaixo do recomendado para esta meta.'}
                </Text>
              )}
            </View>
          )}
        </View>

        {ultrapassou && (
          <View style={styles.alertaVermelho}>
            <Text style={styles.textoAlerta}>
              ⚠️ ATENÇÃO: Os seus gastos ultrapassaram a sua renda total!
            </Text>
          </View>
        )}

        <View style={styles.linhaResumo}>
          <View style={[styles.miniCard, { backgroundColor: '#007AFF' }]}>
            <Text style={styles.miniLabel}>Total Gastos</Text>
            <Text style={styles.miniValor}>R$ {totalGasto.toFixed(2)}</Text>
          </View>
          <View style={[styles.miniCard, { backgroundColor: saldoRestante >= 0 ? '#34C759' : '#FF3B30' }]}>
            <Text style={styles.miniLabel}>Saldo Livre Total</Text>
            <Text style={styles.miniValor}>R$ {saldoRestante.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.botaoWhatsApp} onPress={compartilharWhatsApp}>
          <Text style={styles.textoBotaoWhatsApp}>💬 Partilhar Resumo no WhatsApp</Text>
        </TouchableOpacity>

        {rendaTotalGeral > 0 && (
          <View style={styles.cardInvestimento}>
            <Text style={styles.tituloInvestimento}>📈 Dica de Investimento</Text>
            {saldoRestante > 0 ? (
              <View>
                <Text style={styles.textoInvestimento}>
                  Com base no total recebido ({nomeMesSelecionado}):
                </Text>
                <View style={styles.boxDestaqueInvest}>
                  <Text style={styles.txtDestaqueInvest}>
                    💡 Sugestão para guardar/investir: <Text style={{fontWeight: 'bold', fontSize: 16}}>R$ {investimentoPossivelAtual.toFixed(2)}</Text> este mês!
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.textoInvestimento}>
                Ajuste as despesas variáveis para conseguir ter margem de investimento.
              </Text>
            )}
          </View>
        )}

        {rendaTotalGeral > 0 && (
          <View style={styles.graficoBox}>
            <View style={styles.graficoHeader}>
              <Text style={styles.graficoLabel}>Comprometimento da Renda ({nomeMesSelecionado})</Text>
              <Text style={[styles.graficoPorc, ultrapassou && { color: '#FF3B30' }]}>
                {porcentagemGasta.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.barraFundo}>
              <View 
                style={[
                  styles.barraPreenchida, 
                  { 
                    width: porcentagemGasta + '%',
                    backgroundColor: ultrapassou ? '#FF3B30' : '#007AFF'
                  }
                ]} 
              />
            </View>
            <View style={styles.detalheCategoriasResumo}>
              <Text style={styles.txtCatResumo}>Fixas: R$ {totalFixas.toFixed(2)}</Text>
              <Text style={styles.txtCatResumo}>Variáveis: R$ {totalVariaveis.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {rendaTotalGeral > 0 && (
          <View style={styles.cardProjecao}>
            <Text style={styles.tituloProjecao}>💡 Projeção de Gastos Diários</Text>
            <Text style={styles.textoProjecao}>
              Pagando as contas fixas e reservando para sua meta, tem disponível cerca de <Text style={{fontWeight: 'bold'}}>R$ {Math.max(mediaSugeridaDiaria, 0).toFixed(2)} por dia</Text> para despesas do dia a dia.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.subtituloForm}>
            {editandoId ? '✏️ Editar Lançamento' : `➕ Adicionar Despesa (${nomeMesSelecionado})`}
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Ex: Aluguel, Internet, Supermercado"
            placeholderTextColor="#8E8E93"
            value={descricao}
            onChangeText={setDescricao}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Valor em R$ (Ex: 150,00)"
            placeholderTextColor="#8E8E93"
            keyboardType="decimal-pad"
            value={valor}
            onChangeText={setValor}
          />

          <TouchableOpacity 
            style={styles.seletorBancoBotao} 
            onPress={() => setModalBancoVisible(true)}
          >
            <Text style={styles.txtRotuloBanco}>Cartão / Banco:</Text>
            <Text style={styles.txtBancoEscolhido}>💳 {bancoSelecionado} ▼</Text>
          </TouchableOpacity>

          <View style={styles.seletorTipo}>
            <TouchableOpacity
              style={[styles.btnTipo, tipo === 'fixa' && styles.btnTipoFixaAtivo]}
              onPress={() => setTipo('fixa')}
            >
              <Text style={[styles.txtTipo, tipo === 'fixa' && styles.txtTipoAtivo]}>Despesa Fixa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnTipo, tipo === 'variavel' && styles.btnTipoVarAtivo]}
              onPress={() => setTipo('variavel')}
            >
              <Text style={[styles.txtTipo, tipo === 'variavel' && styles.txtTipoAtivo]}>Despesa Variável</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.botaoAdicionar} onPress={salvarTransacao}>
            <Text style={styles.textoBotao}>
              {editandoId ? 'Salvar Alteração' : 'Adicionar à Planilha'}
            </Text>
          </TouchableOpacity>

          {editandoId && (
            <TouchableOpacity 
              style={styles.botaoCancelar} 
              onPress={() => { setEditandoId(null); setDescricao(''); setValor(''); }}
            >
              <Text style={styles.textoBotaoCancelar}>Cancelar Edição</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cabecalhoListaContainer}>
          <Text style={styles.subtituloLista}>Histórico de Despesas ({nomeMesSelecionado})</Text>
          {(transacoesDoMes.length > 0 || rendasExtrasDoMes.length > 0) && (
            <TouchableOpacity onPress={limparTudo}>
              <Text style={styles.txtZerar}>🗑️ Zerar Mês</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtrosRow}>
          <TouchableOpacity 
            style={[styles.filtroBtn, filtro === 'todas' && styles.filtroAtivo]} 
            onPress={() => setFiltro('todas')}
          >
            <Text style={[styles.filtroTxt, filtro === 'todas' && styles.filtroTxtAtivo]}>Todas</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filtroBtn, filtro === 'fixa' && styles.filtroAtivo]} 
            onPress={() => setFiltro('fixa')}
          >
            <Text style={[styles.filtroTxt, filtro === 'fixa' && styles.filtroTxtAtivo]}>Só Fixas</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filtroBtn, filtro === 'variavel' && styles.filtroAtivo]} 
            onPress={() => setFiltro('variavel')}
          >
            <Text style={[styles.filtroTxt, filtro === 'variavel' && styles.filtroTxtAtivo]}>Só Variáveis</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabelaHeader}>
          <Text style={[styles.colHeader, { flex: 1.6 }]}>Descrição / Banco</Text>
          <Text style={[styles.colHeader, { flex: 0.8 }]}>Tipo</Text>
          <Text style={[styles.colHeader, { flex: 1.1, textAlign: 'right' }]}>Valor</Text>
          <Text style={[styles.colHeader, { width: 35, textAlign: 'center' }]}>Del</Text>
        </View>

        <FlatList
          data={transacoesFiltradas}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.tabelaLinha}>
              <TouchableOpacity style={{ flex: 1.6 }} onPress={() => prepararEdicao(item)}>
                <Text style={styles.colTexto} numberOfLines={1}>{item.descricao}</Text>
                <Text style={styles.colSubTexto} numberOfLines={1}>💳 {item.banco || 'Nubank'}</Text>
              </TouchableOpacity>
              
              <View style={{ flex: 0.8, alignItems: 'flex-start' }}>
                <Text style={[styles.colBadge, item.tipo === 'fixa' ? styles.badgeFixa : styles.badgeVar]}>
                  {item.tipo === 'fixa' ? 'Fixa' : 'Variável'}
                </Text>
              </View>

              <Text style={[styles.colValor, { flex: 1.1 }]}>- R$ {item.valor.toFixed(2)}</Text>
              
              <TouchableOpacity style={styles.btnDeletar} onPress={() => removerTransacao(item.id)}>
                <Text style={styles.txtDeletar}>❌</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhuma despesa encontrada em {nomeMesSelecionado}.</Text>
          }
        />
      </ScrollView>

      {/* MODAL SELETOR DE BANCOS */}
      <Modal visible={modalBancoVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitulo}>Selecione o Cartão / Banco</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {BANCOS_BRASIL.map((b) => (
                <TouchableOpacity
                  key={b.nome}
                  style={[styles.modalItem, bancoSelecionado === b.nome && styles.modalItemAtivo]}
                  onPress={() => {
                    setBancoSelecionado(b.nome);
                    setModalBancoVisible(false);
                  }}
                >
                  <View style={[styles.bolaCorBanco, { backgroundColor: b.cor }]} />
                  <Text style={styles.modalItemTxt}>{b.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalBotaoFechar} 
              onPress={() => setModalBancoVisible(false)}
            >
              <Text style={styles.modalBotaoFecharTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SELETOR DE MESES */}
      <Modal visible={modalMesVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitulo}>Selecione o Mês</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {MESES.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modalItem, mesSelecionado === m.id && styles.modalItemAtivo]}
                  onPress={() => {
                    setMesSelecionado(m.id);
                    setModalMesVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemTxt, mesSelecionado === m.id && { fontWeight: 'bold', color: '#007AFF' }]}>
                    {m.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalBotaoFechar} 
              onPress={() => setModalMesVisible(false)}
            >
              <Text style={styles.modalBotaoFecharTxt}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL RESUMO ANUAL (VISÃO GERAL POR MÊS) */}
      <Modal visible={modalAnualVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitulo}>📊 Resumo Anual de Gastos</Text>
            <Text style={styles.modalSubTitulo}>Clique num mês para abrir os detalhes:</Text>
            
            <ScrollView style={{ maxHeight: 380 }}>
              {MESES.map((m) => {
                const totalM = calcularTotalMes(m.id);
                const isAtivo = mesSelecionado === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.modalItemAnual, isAtivo && styles.modalItemAnualAtivo]}
                    onPress={() => {
                      setMesSelecionado(m.id);
                      setModalAnualVisible(false);
                    }}
                  >
                    <Text style={[styles.txtMesAnual, isAtivo && { fontWeight: 'bold', color: '#007AFF' }]}>
                      {m.nome} {isAtivo ? ' (Atual)' : ''}
                    </Text>
                    <Text style={[styles.txtValorAnual, totalM > 0 ? { color: '#FF3B30' } : { color: '#8E8E93' }]}>
                      R$ {totalM.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalBotaoFechar} 
              onPress={() => setModalAnualVisible(false)}
            >
              <Text style={styles.modalBotaoFecharTxt}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#F2F2F7',
    flexGrow: 1,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  subtituloHeader: {
    fontSize: 13,
    color: '#636366',
    textAlign: 'center',
    marginBottom: 12,
  },
  linhaSeleitoresMes: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cardSeletorMes: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  botaoVisaoAnual: {
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  txtBotaoAnual: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  txtRotuloMes: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  txtMesAtivo: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardRenda: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardRendaExtra: {
    backgroundColor: '#EBF3FF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#007AFF',
  },
  cardMeta: {
    backgroundColor: '#FFF9E6',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#FFCC00',
  },
  tituloMeta: {
    fontWeight: 'bold',
    color: '#7A5C00',
    marginBottom: 10,
    fontSize: 15,
  },
  boxResultadoMeta: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    borderLeftWidth: 4,
  },
  txtResultadoMeta: {
    fontSize: 13,
    color: '#3A3A3C',
  },
  txtAporteMeta: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  txtStatusMeta: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  rowInput: {
    flexDirection: 'row',
  },
  btnRendaExtra: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  txtBtnRendaExtra: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  boxListaExtra: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
  },
  itemRendaExtra: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  txtItemExtra: {
    fontSize: 13,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  txtDelExtra: {
    fontSize: 11,
  },
  labelCard: {
    fontSize: 14,
    color: '#3A3A3C',
    marginBottom: 6,
    fontWeight: '600',
  },
  inputRenda: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#1C1C1E',
  },
  alertaVermelho: {
    backgroundColor: '#FFD1D1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#FF3B30',
  },
  textoAlerta: {
    color: '#A80000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  linhaResumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  miniCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  miniLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
  },
  miniValor: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 4,
  },
  botaoWhatsApp: {
    backgroundColor: '#25D366',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  textoBotaoWhatsApp: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  cardInvestimento: {
    backgroundColor: '#EFFFEC',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#34C759',
  },
  tituloInvestimento: {
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 6,
    fontSize: 15,
  },
  textoInvestimento: {
    color: '#2E7D32',
    fontSize: 13,
  },
  boxDestaqueInvest: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  txtDestaqueInvest: {
    color: '#1B5E20',
    fontSize: 14,
  },
  graficoBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  graficoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  graficoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A3A3C',
  },
  graficoPorc: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  barraFundo: {
    height: 10,
    backgroundColor: '#E5E5EA',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barraPreenchida: {
    height: '100%',
    borderRadius: 5,
  },
  detalheCategoriasResumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  txtCatResumo: {
    fontSize: 11,
    color: '#636366',
  },
  cardProjecao: {
    backgroundColor: '#F0F4FF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#007AFF',
  },
  tituloProjecao: {
    fontWeight: 'bold',
    color: '#004080',
    marginBottom: 6,
    fontSize: 15,
  },
  textoProjecao: {
    color: '#003366',
    fontSize: 13,
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  subtituloForm: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 10,
  },
  seletorBancoBotao: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  txtRotuloBanco: {
    color: '#3A3A3C',
    fontSize: 14,
  },
  txtBancoEscolhido: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  seletorTipo: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  btnTipo: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  btnTipoFixaAtivo: {
    backgroundColor: '#007AFF',
  },
  btnTipoVarAtivo: {
    backgroundColor: '#FF9500',
  },
  txtTipo: {
    color: '#3A3A3C',
    fontSize: 13,
    fontWeight: '600',
  },
  txtTipoAtivo: {
    color: '#FFFFFF',
  },
  botaoAdicionar: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotao: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  botaoCancelar: {
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  textoBotaoCancelar: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  cabecalhoListaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtituloLista: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  txtZerar: {
    color: '#FF3B30',
    fontWeight: 'bold',
    fontSize: 13,
  },
  filtrosRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  filtroBtn: {
    flex: 1,
    padding: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  filtroAtivo: {
    backgroundColor: '#1C1C1E',
  },
  filtroTxt: {
    fontSize: 12,
    color: '#3A3A3C',
    fontWeight: '600',
  },
  filtroTxtAtivo: {
    color: '#FFFFFF',
  },
  tabelaHeader: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    padding: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  colHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3A3A3C',
  },
  tabelaLinha: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  colTexto: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  colSubTexto: {
    fontSize: 11,
    color: '#007AFF',
    marginTop: 2,
    fontWeight: '600',
  },
  colBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeFixa: {
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
  },
  badgeVar: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
  },
  colValor: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF3B30',
    textAlign: 'right',
  },
  btnDeletar: {
    width: 35,
    alignItems: 'center',
  },
  txtDeletar: {
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubTitulo: {
    fontSize: 13,
    color: '#636366',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalItemAtivo: {
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
  },
  modalItemAnual: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalItemAnualAtivo: {
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
  },
  txtMesAnual: {
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  txtValorAnual: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  bolaCorBanco: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  modalItemTxt: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  modalBotaoFechar: {
    backgroundColor: '#E5E5EA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  modalBotaoFecharTxt: {
    color: '#1C1C1E',
    fontWeight: 'bold',
    fontSize: 14,
  },
});