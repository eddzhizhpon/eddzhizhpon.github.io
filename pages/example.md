---
layout: default
---

## Ejemplo Práctico

### A. Planteamiento y descripción del problema

La peluquería XYZ quiere saber cuál sería el posible comportamiento, en base al tiempo, si se contratan más peluqueros. Se tiene que tener en cuenta que el ingreso de clientes al establecimiento se deberá hacer de manera pseudoaleatoria, y que en caso de que no haya peluqueros disponibles, tendrán que esperar hasta que uno esté libre.

El modelo generado deberá ser lo más parametrizable posible, para poder ejecutar varias simulaciones con diferentes datos, y así observar diferentes comportamientos.

### B. Proceso de solución

Para poder modelar el comportamiento de la peluquería, fue necesario establecer analizar y establecer lo siguiente:

1. Los actores y procesos involucrados en el entorno real (la peluquería):
    - Actores:
        - Clientes (C)
        - Peluqueros (P)

    - Procesos:
        - Ingresar a la peluquería (C).
        - Esperar el turno (C).
        - Cortar cabello (P).
        - Llamar al siguiente cliente (P).
        - Salir de la peluquería (C).

1. Las variables de interés para el modelo:
    - Número de peluqueros.
    - Número de clientes.
    - Tiempo mínimo y máximo para un corte de cabello.

Una vez se hayan definido una lista de elementos básicos para el modelo, es necesario verificar si los elementos son suficientes. Posterior a una depuración de la lista se procede a la abstracción de las características de aquellos elementos para poder codificarlos.

### C. Código del programa

```cpp
#include <systemc.h>
#include <time.h>
#include <cstring>

using namespace std;

const int SEED = 69;
const int HAIRCUTTER_NUM = 4;
const double HAIRCUT_TIME_MIN = 10;
const double HAIRCUT_TIME_MAX = 15;
const double ARRIVAL_TIME = 5;
const int CLIENTS_TO_SIMULATE = 10;

double getRandom() 
{
  return rand()/(double)RAND_MAX;
}

class Haircutter : public sc_module
{
  public:
    sc_in<int> clientId;
    sc_event finishEvent;
    sc_event haircutEvent;
    int id;
    bool isBusy;
    
    SC_HAS_PROCESS(Haircutter);

    Haircutter(sc_module_name name) : sc_module(name) 
    {
      SC_METHOD(raise);
        sensitive << clientId;
      SC_THREAD(haircut);
    }

    /**
     * Notificación del evento para iniciar el corte
     * de cabello. Este método se lanza al recibir 
     * la señal de la variable "clientId"
     */
    void raise()
    {
      haircutEvent.notify();
    }
    /**
     * Método CS_THREAD que se ejecuta en un bucle 
     * infinito. Mantiene en estado de espera hasta
     * recibir la notificación del evento "haircutEvent" para 
     * realizar el proceso de corte de cabello. 
     */ 
    void haircut() 
    {
      while(true)
      {
        wait(haircutEvent);
        isBusy = true;
        cout << "<Corte de cabello> El Peluquero " << id 
          << " recibe al Cliente " << clientId << endl;
        double random = getRandom();
        double haircutTerm = HAIRCUT_TIME_MAX - HAIRCUT_TIME_MIN;
        double haircutTime = HAIRCUT_TIME_MIN + (haircutTerm * random);
        wait(sc_time(haircutTime, SC_SEC));
        cout << "<Corte de cabello> Finalizado al Cliente " 
          << clientId << " en " << haircutTime  << " seg, al global " 
          << sc_time_stamp().to_seconds() << " seg " << endl;
        isBusy = false;
        finishEvent.notify();
      }
    }
  
};

class HaircutterManager : public sc_module
{
  public:
    sc_in<int> clientId;
    sc_vector<sc_signal<int>> values_out_sig;
    
    SC_HAS_PROCESS(HaircutterManager);

    HaircutterManager(sc_module_name name) 
      : sc_module(name), values_out_sig("values_out_sig", HAIRCUTTER_NUM) 
    {
      SC_METHOD(welcomeClient);
        sensitive << clientId;
      ticket = 0;
    }

    /**
     * Recibe el id del cliente para asignar a un peluquero
     * mediante señal de salida.
     */
    void welcomeClient() 
    {
      values_out_sig[ticket%HAIRCUTTER_NUM] = clientId;
      ticket++;
    }

  private:
    int ticket;
};

class Hairdressing : public sc_module
{
  public:
    sc_vector<Haircutter> haircutters;
    HaircutterManager haircutterManager;
    sc_signal<int> signal;
    sc_fifo<int> clients;
    sc_event_or_list events;

    SC_HAS_PROCESS(Hairdressing);

    Hairdressing(sc_module_name name) 
      : sc_module(name), 
      haircutters("haircutters", HAIRCUTTER_NUM), 
      haircutterManager("haircutterManager"), 
      clients(CLIENTS_TO_SIMULATE)
    {
      SC_THREAD(reception);
      SC_THREAD(passClient);
      for (int i = 0; i < HAIRCUTTER_NUM; i++)
      {
        haircutters[i].clientId(haircutterManager.values_out_sig[i]);
        haircutters[i].id = i + 1;
        events |= haircutters[i].finishEvent;
      }
      haircutterManager.clientId(signal);
    }
    /**
     * Crea a los clientes en intervalos aleatorios.
     */
    void reception()
    {
      int i = 1;
      while(true)
      {
        if (i == CLIENTS_TO_SIMULATE + 1) break;
        double random = getRandom();
        double arrive = -ARRIVAL_TIME * log(random);
        wait(sc_time(arrive, SC_SEC));
        cout << "<Recepción> Entra el Cliente " << i 
          << ", y tiene el turno " << i <<  ", a los " 
          << sc_time_stamp().to_seconds() << " seg " << endl;
        clients.write(i);
        i++;

      }
    }
    /**
     * Envía al cliente para asignarlo a un peluquero
     */
    void passClient()
    {
      while (true) {
        // Lectura del cliente
        int clientId = -1;
        clients.read(clientId);
        if (clientId == -1) continue;

        // Validación de disponibilidad de peluqueros
        double arriveTime = sc_time_stamp().to_seconds();
        bool busy = true;
        for (Haircutter &h : haircutters) busy = busy && h.isBusy;
        if (busy) wait(events);
        
        double clientWaitTime = sc_time_stamp().to_seconds() - arriveTime;
        cout << "<Recepción> El Cliente " << clientId 
          << " pasa con el peluquero esperando " << clientWaitTime 
          << " seg " << endl;
        cout << "<Recepción> Clientes en cola " 
          << clients.num_available() << endl;

        // Envío del cliente al corte de cabello
        signal.write(clientId);
        wait(sc_time(1, SC_SEC));
      }
    }
};

int sc_main(int argc, char* argv[])
{
  Hairdressing Hairdressing("Hairdressing");
  // Para valores aleatorios sin semilla
  // srand(time(NULL));
  // Establecimiento de la semilla
  srand(SEED);

  cout << endl << "\t----- Simulación de Peluquería -----" 
    << endl << endl;
  sc_start();
  cout << endl << "\t----- Tiempo de simulación = " 
    << sc_time_stamp().to_seconds() << " -----" << endl;
  return 0;
}
```

**Salida del Ejemplo**

```
        ----- Simulación de Peluquería -----

<Recepción> Entra el Cliente 1, y tiene el turno 1, a los 1.70738 seg 
<Recepción> El Cliente 1 pasa con el peluquero esperando 0 seg 
<Recepción> Clientes en cola 0
<Corte de cabello> El Peluquero 2 recibe al Cliente 1
<Recepción> Entra el Cliente 2, y tiene el turno 2, a los 1.79217 seg 
<Recepción> El Cliente 2 pasa con el peluquero esperando 0 seg 
<Recepción> Clientes en cola 0
<Corte de cabello> El Peluquero 3 recibe al Cliente 2
<Recepción> Entra el Cliente 3, y tiene el turno 3, a los 4.63312 seg 
<Recepción> El Cliente 3 pasa con el peluquero esperando 0 seg 
<Recepción> Clientes en cola 0
<Corte de cabello> El Peluquero 4 recibe al Cliente 3
<Recepción> Entra el Cliente 4, y tiene el turno 4, a los 6.33098 seg 
<Recepción> El Cliente 4 pasa con el peluquero esperando 0 seg 
<Recepción> Clientes en cola 0
<Corte de cabello> El Peluquero 1 recibe al Cliente 4
<Recepción> Entra el Cliente 5, y tiene el turno 5, a los 7.26372 seg 
<Recepción> Entra el Cliente 6, y tiene el turno 6, a los 13.0783 seg 
<Corte de cabello> Finalizado al Cliente 1 en 14.3096 seg, al global 16.017 seg 
<Recepción> El Cliente 5 pasa con el peluquero esperando 8.68598 seg 
<Recepción> Clientes en cola 1
<Corte de cabello> El Peluquero 2 recibe al Cliente 5
<Corte de cabello> Finalizado al Cliente 3 en 11.9271 seg, al global 16.5602 seg 
<Corte de cabello> Finalizado al Cliente 4 en 10.2481 seg, al global 16.5791 seg 
<Recepción> El Cliente 6 pasa con el peluquero esperando 0 seg 
<Recepción> Clientes en cola 0
<Corte de cabello> Finalizado al Cliente 6 en 14.6269 seg, al global 17.3342 seg 
<Recepción> Entra el Cliente 7, y tiene el turno 7, a los 23.6187 seg 
<Recepción> El Cliente 7 pasa con el peluquero esperando 0 seg 
<Recepción> Clientes en cola 0
<Corte de cabello> El Peluquero 4 recibe al Cliente 7
<Corte de cabello> Finalizado al Cliente 5 en 10.6817 seg, al global 26.6987 seg 
<Recepción> Entra el Cliente 8, y tiene el turno 8, a los 32.9404 seg 
<Recepción> El Cliente 8 pasa con el peluquero esperando 0 seg 
<Recepción> Clientes en cola 0
<Corte de cabello> El Peluquero 1 recibe al Cliente 8
<Recepción> Entra el Cliente 9, y tiene el turno 9, a los 33.5802 seg 
<Recepción> Entra el Cliente 10, y tiene el turno 10, a los 33.6448 seg 
<Corte de cabello> Finalizado al Cliente 7 en 10.1748 seg, al global 33.7935 seg 
<Recepción> El Cliente 9 pasa con el peluquero esperando 0 seg 
<Recepción> Clientes en cola 1
<Corte de cabello> El Peluquero 2 recibe al Cliente 9
<Recepción> El Cliente 10 pasa con el peluquero esperando 0 seg 
<Recepción> Clientes en cola 0
<Corte de cabello> El Peluquero 3 recibe al Cliente 10
<Corte de cabello> Finalizado al Cliente 8 en 10.8648 seg, al global 43.8051 seg 
<Corte de cabello> Finalizado al Cliente 10 en 11.4256 seg, al global 46.3659 seg 
<Corte de cabello> Finalizado al Cliente 9 en 13.4303 seg, al global 47.3707 seg 

        ----- Tiempo de simulación = 47.3707 -----
```

[Página Principal]({{site.baseurl}}/)
