package Modulo1;

import java.util.Scanner;

public class EntradaDeDados {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Qual seu nome: ");
        String nome = input.nextLine();

        System.out.println("Digite o primeiro número: ");
        int numero1 = input.nextInt();

        System.out.println("Digite o segundo número: ");
        int numero2 = input.nextInt();

        int soma = numero1 + numero2;
        System.out.println(nome +", a soma dos números é " + soma);

        input.close();
    }
}
