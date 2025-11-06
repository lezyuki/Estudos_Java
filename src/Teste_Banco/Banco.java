package Teste_Banco;

public class Banco {
    public static void main(String[] args) {
        Conta conta = new Conta();
        conta.titular_conta = "Leandro";
        conta.saldo = 2000;

        conta.opcao();
    }
}
