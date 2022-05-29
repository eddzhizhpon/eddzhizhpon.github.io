---
layout: default
---

## Documentación

***

<details markdown=1 class="detail">
<summary markdown="span" class="detail-title">
Introducción a SystemC
</summary>

### A. Hola Mundo con SystemC
Los elementos fundamentales para construir un programa con SystemC, son tres.

1. **El archivo de cabecera (header file):** Un header file contiene la declaración directa de elementos de código, tales como: clases, variables, subrutinas, entre otros. En este caso, para utilizar cualquier funcionalidad de SystemC, se debe incluir uno de los siguientes header files:

    - `#include <systemc.h>`
    Versión nueva del header file, el cuál incluye todo de los namespaces: `sc_core` y `sc_dt`.

    - `#include <systemc>`
    Versión antigua del header file. Si se usa, a continuación se debe definir el namespace `sc_core`.

2. **El punto de entrada:** En C++, el punto de entrada al programa es la función `main()`, sin embargo SystemC define su propia función, la cual es `int sc_main(int arg, char* argv[])`{:.c}.


3. **El módulo:** Un módulo, en el contexto de SystemC, es la estructura base para la construcción de cualquier proceso de simulación. En la siguiente sección se profundizará este concepto.

A continuación, se mostrará el código para obtener un "Hola Mundo":

```c++
#include "systemc.h"

struct HelloWorld : sc_module
{
  SC_CTOR(HelloWorld)
  {
    SC_METHOD(hello);
  }

  void hello(void)
  {
    std::cout << "Hola mundo desde SystemC" << std::endl;
  }
};

int sc_main(int, char *[])
{
  HelloWorld helloworld("helloworld");
  sc_start();
  return 0;
}
```

### B. Constructor



### C. Notación de Tiempo



### D. Módulo





</details>

***

<details markdown=1>
<summary markdown="span" class="detail-title">
Simulación
</summary>

### A. Procesos

Características de un proceso:
1. Pertenece a la clase `sc_module`.
1. No tiene un argumento de entrada o retorno de valores.
1. Es registrado con el kernel `simulation`.

Para el registro de un Proceso de Simulación, se puede realizar con los siguientes métodos:
1. `SC_METHOD(func)`: no tiene un hilo de ejecución propio, no consume tiempo simulado, no se puede suspender y no se puede llamar a la función `wait()`.
1. `SC_THREAD(func)`: tiene su propio hilo de ejecución, puede consumir tiempo simulado, puede ser suspendido y puede llamar a la función `wait()`.
1. `SC_CTHREAD(func, event)`: es una función especial de `SC_THREAD`, con la diferencia de que este método se activa cada vez que ocurra el borde de reloj especificado.

¿Cuándo puede realizarse un registro?
1. En el cuerpo del Constructor.
1. En los callbacks `before_end_of_elaboration` o `end_of_elaboration`.
1. Desde una función llamada desde el Constructor o callbacks.

Restricciones:
1. Los registros solo pueden ser establecidos en funciones del mismo módulo.
1. `SC_CTHREAD` no debe ser invocado desde el callback `end_of_elaboration`.

Notas:
1. `SC_THREAD` puede hacer todo lo que `SC_METHOD` y `SC_CHTEAD`. Por lo que es el más utilizado en esta biblioteca.
1. `SC_THREAD` no requiere de un bucle `while`, ya que puede ser llamado por `next_trigger()`.

**Ejemplo de la Simulación por Procesos**

```c++
#include "systemc.h"

SC_MODULE(PROCESS)
{
  // Declaración de reloj
  sc_clock clk;
  SC_CTOR(PROCESS) : clk("clk", 1, SC_SEC)
  {
    // Registro para SC_METHOD
    SC_METHOD(method);
    // Registro de un hilo
    SC_THREAD(thread);
    // Registro de un hilo con reloj
    SC_CTHREAD(cthread, clk);
  }
  // Definición de la Función para SC_METHOD
  void method(void)
  {
    std::cout << "Ej. SC_METHOD @ " << sc_time_stamp() << std::endl;
    // Trigger después de 1 seg
    next_trigger(sc_time(1, SC_SEC));
  }
  // Definición de la Función para SC_THREAD
  void thread()
  {
    // Bucle infinito
    while (true)
    {
      std::cout << "Ej. SC_THREAD @ " << sc_time_stamp() << std::endl;
      // Espera de 1 seg
      wait(1, SC_SEC);
    }
  }
  // Definición de la Función para SC_CTHREAD
  void cthread()
  {
    // Bucle infinito
    while (true)
    {
      std::cout << "Ej. SC_CTHREAD @ " << sc_time_stamp() << std::endl;
      // Espera hasta el siguiente evento clk,
      // que se ejecuta después de 1 seg.
      wait();
    }
  }
};

int sc_main(int, char *[])
{
  // Instancia del módulo
  PROCESS process("Simulación_de_Procesos");
  std::cout << "La ejecución comienza @ " 
    << sc_time_stamp() << std::endl;
  // La simulación correrá durante 2 segundos
  sc_start(2, SC_SEC);
  std::cout << "La ejecución termina @ " 
    << sc_time_stamp() << std::endl;
  return 0;
}
```

### B. Escenarios

La lógica de programación en SystemC se lo abstrae en 3 fases o escenarios:
<ol>
<li><strong>Elaboración:</strong> el objetivo es crear estructuras de datos internas de la semántica de la simulación. Esta creación abarca los módulos, puertos, canales primitivos y procesos.</li>
<li><strong>Ejecución:</strong> se puede dividir en dos etapas:
  <ol type="a">
    <li><strong>Inicialización:</strong> el kernel de simulación identifica los procesos y los etiqueta como ejecutable o en espera</li>
    <li><strong>Simulación:</strong> una máquina de estado programa la ejecución de procesos y avanza el tiempo de simulación. Este se compone de dos fases internas:
      <ol type="i"> 
      <li><strong>Evaluar:</strong> ejecuta todos los procesos uno a la vez hasta <code>wait()</code>.</li>
      <li><strong>Avance de tiempo:</strong> esta fase se ejecuta después de que el conjunto de procesos ejecutables termine, donde:
        <ol type="a">
        <li>Mueve el tiempo de simulación al tiempo más cercano con un evento programado.</li>
        <li>Mueve los procesos del estado en espera a ejecutables.</li>
        <li>Vuelve a la fase de "Evaluar"</li>
        </ol>
        El proceso continúa hasta que ocurra:
        <ol type="a">
        <li>Todos los procesos se han ejecutado</li>
        <li>Algún proceso ha ejecutado <code>sc_stop()</code></li>
        <li>Se ha alcanzado el tiempo máximo</li>
        </ol>
      </li>
      </ol>
    </li>
  </ol>
</li>
<li><strong>Limpieza:</strong> esta fase consiste en destruir objetos, librerar memoria, cerrar archivos abiertos, y otras acciones que se requerieran una vez terminadad la simulación.</li>
</ol>

**Ejemplo de la Simulación por Escenarios**

```c++
#include "systemc.h"

SC_MODULE(STAGE){
  // Elaboración
  SC_CTOR(STAGE){
    std::cout << sc_time_stamp() 
      << ": Elaboración: constructor" << std::endl;
    // Inicialización + Simulación
    SC_THREAD(thread);
  }
  // Limpieza
  ~STAGE()
  {
    std::cout << sc_time_stamp() 
      << ": Limpieza: destructor" << std::endl;
  }
  void thread()
  {
    std::cout << sc_time_stamp() 
      << ": Ejecución.inicialización" << std::endl;
    int i = 0;
    while (true)
    {
      // Avance de tiempo
      wait(1, SC_SEC);
      // Evaluación
      std::cout << sc_time_stamp() 
        << ": Ejecución.simulación" << std::endl;
      if (++i >= 2)
      {
        // Detiene la simulación después de 2 iteraciones
        sc_stop();
      }
    }
  }
  void before_end_of_elaboration()
  {
    std::cout << "Método: before end of elaboration" << std::endl;
  }
  void end_of_elaboration()
  {
    std::cout << "Método: end of elaboration" << std::endl;
  }
  void start_of_simulation()
  {
    std::cout << "Método: start of simulation" << std::endl;
  }
  void end_of_simulation()
  {
    std::cout << "Método: end of simulation" << std::endl;
  }
};

int sc_main(int, char *[])
{
  // Elaboración
  STAGE stage("Escenario");
  // Ejecución hasta sc_stop
  sc_start();
  // Limpieza
  return 0;
}
```
</details>

***

<details markdown=1>
<summary markdown="span" class="detail-title">
Eventos
</summary>

Contenido...

</details>

***

<details markdown=1>
<summary markdown="span" class="detail-title">
Señal
</summary>

### Leer y Escribir



</details>

***

<details markdown=1>
<summary markdown="span" class="detail-title">
Comunicación
</summary>

### Puerto



### Puerto a Puerto (Port 2 Port)



</details>

[Página Principal]({{site.baseurl}}/)