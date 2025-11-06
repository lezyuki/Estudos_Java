package Teste_Banco;
import java.util.*;
public class Conta {
    Scanner input = new Scanner(System.in);

    String titular_conta;
    double saldo;


    void opcao(){
        int escolha = 0;
        while(escolha != 5){
            System.out.println("""
        \n============ BEM VINDO AO BANCO ============
        1. Saldo
        2. Depositar
        3. Sacar    
        4. Emprestimo
        5. Encerrar sessão 
        Escolha: """);
        escolha = input.nextInt();

        if (escolha == 1){
           verSaldo();
        }else if (escolha == 2){
            System.out.println("Escolha o valor de depósito: ");
            double valor = input.nextDouble();
            depositar(valor);
        }else if (escolha == 3){
            System.out.println("Escolha o valor de saque: ");
            double valor = input.nextDouble();
            sacar(valor);
        }else if (escolha == 4){
            System.out.println("Digite o valor do empréstimo: ");
            double valor = input.nextDouble();
            emprestar(valor);
        }else if (escolha == 5){
            System.out.println("Sessão encerrada!");
        } else {
            System.out.println("Opção inválida!");
        }
      }
    }

    void verSaldo(){
        System.out.println("Saldo atual: R$ " + saldo);
    }
    void depositar(double valor){
         if (valor > 0){
             saldo += valor;
             System.out.println("Depósito realizado! Novo saldo: R$ " + saldo);
         } else {
             System.out.println("Valor inválido!");
         }
    }
    void sacar(double valor){
        if (valor <= saldo && valor > 0) {
            saldo -= valor;
        System.out.println("Saque realizado! Novo saldo: R$ " + saldo);
        }else {
            System.out.println("Saldo insuficiente!");
        }
    }
    void emprestar(double valor){
        if (saldo >= 999){
            saldo += valor;
            System.out.println("Empréstimo realizado, seu novo saldo é de: " + saldo);
        }else {
            System.out.println("Empréstimo indisponível!");
        }
    }
}


