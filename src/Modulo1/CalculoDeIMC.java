package Modulo1;

import java.util.Scanner;
public class CalculoDeIMC {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Digite seu peso: ");
        double peso = input.nextDouble();

        System.out.println("Digite sua altura: ");
        double altura = input.nextDouble();

        double imc = peso / (altura * altura);

        if (imc < 18.5) {
            System.out.println("Abaixo do peso!");
        } else if (imc >= 18.5 && imc <= 24.9) {
            System.out.println("Peso normal!");
        } else if (imc >= 25 && imc <= 29.9) {
            System.out.println("Sobrepeso");
        } else if (imc > 30) {
            System.out.println("Obesidade");
        }


        System.out.printf("Seu IMC é: %.2f", imc);

        input.close();
    }
}

